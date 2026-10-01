import { PDFDocument, StandardFonts } from 'pdf-lib';
import { getDocumentProxy } from 'unpdf';
import { describe, expect, it, vi } from 'vitest';
import { parseBank } from '../src/core/bank';
import { importBank, ImportValidationError } from '../src/core/import';
import { loadSystem } from '../src/core/prompt';
import { MAX_PDF_BYTES } from '../src/core/limits';
import { extractResumeText, importResume, ImportInputError, MAX_PDF_PAGES, MAX_RESUME_CHARS } from '../src/server/importResume';

const RESUME = `Jordan Rivera
Brisbane QLD

Summary
Operations coordinator with 7 years of experience running a team of 12.

Experience
Operations Coordinator, Northside Logistics, 2019 - 2024
- Cut dispatch delays by 30% by reworking the daily roster.
- Trained 12 new starters.

Education
Diploma of Business, Riverbank Institute, 2018
`;

// Spy on the document unpdf opens, to check it is released.
vi.mock('unpdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('unpdf')>();
  return { ...actual, getDocumentProxy: vi.fn(actual.getDocumentProxy) };
});

// Loosely typed on purpose: tests poke invalid values into the model's answer.
type Answer = Record<string, any>;

const bank = (overrides: Record<string, unknown> = {}): Answer => ({
  profile: { region: 'Brisbane QLD' },
  bank: {
    basics: { name: 'Jordan Rivera', location: 'Brisbane QLD' },
    summaries: [{ id: 'summary-1', text: 'Operations coordinator with 7 years of experience running a team of 12.' }],
    sections: [
      {
        type: 'experience',
        items: [
          {
            id: 'exp-northside',
            title: 'Operations Coordinator',
            org: 'Northside Logistics',
            start: '2019',
            end: '2024',
            bullets: [
              { id: 'exp-northside-b1', text: 'Cut dispatch delays by 30% by reworking the daily roster.' },
              { id: 'exp-northside-b2', text: 'Trained 12 new starters.' },
            ],
          },
        ],
      },
      {
        type: 'education',
        items: [{ id: 'edu-riverbank', credential: 'Diploma of Business', institution: 'Riverbank Institute', end: '2018' }],
      },
    ],
    skills: [],
  },
  personal: '# Personal\n',
  warnings: [],
  ...overrides,
});

const withBank = (patch: (value: Answer) => void): Answer => {
  const value = bank();
  patch(value);
  return value;
};

const returning = (...answers: unknown[]) => {
  const completeJson = vi.fn();
  for (const answer of answers) completeJson.mockResolvedValueOnce(answer);
  return completeJson;
};

describe('importBank', () => {
  it('turns a valid model answer into three editable documents', async () => {
    const completeJson = returning(bank());
    const draft = await importBank(RESUME, { completeJson });

    expect(completeJson).toHaveBeenCalledTimes(1);
    expect(completeJson.mock.calls[0][0]).toBe('import');
    expect(completeJson.mock.calls[0][1]).toBe(loadSystem('import'));
    expect(completeJson.mock.calls[0][2]).toBe(`<resume>\n${RESUME}\n</resume>`);

    expect(parseBank(draft.resumeYaml).summaries).toHaveLength(1);
    expect(draft.profileYaml).toContain('pageTarget: 1');
    expect(draft.profileYaml).toContain('region: Brisbane QLD');
    expect(draft.personalMd).toBe('# Personal\n');
    expect(draft.warnings).toEqual([]);
  });

  it('passes the model warnings through', async () => {
    const draft = await importBank(RESUME, { completeJson: returning(bank({ warnings: ['No summary in the resume, so one was drafted'] })) });
    expect(draft.warnings).toEqual(['No summary in the resume, so one was drafted']);
  });

  it('warns about a name the resume does not contain, but keeps the draft', async () => {
    const answer = withBank((value) => {
      value.bank.sections[0].items[0].org = 'Southside Freight';
    });
    const draft = await importBank(RESUME, { completeJson: returning(answer) });
    expect(draft.warnings).toHaveLength(1);
    expect(draft.warnings[0]).toContain('Southside Freight');
  });

  it('rejects an invented number after one retry that lists the failure', async () => {
    const invented = withBank((value) => {
      value.bank.sections[0].items[0].bullets[1].text = 'Trained 40 new starters.';
    });
    const completeJson = returning(invented, invented);
    await expect(importBank(RESUME, { completeJson })).rejects.toBeInstanceOf(ImportValidationError);

    expect(completeJson).toHaveBeenCalledTimes(2);
    expect(completeJson.mock.calls[1][2]).toContain('The previous response failed validation');
    expect(completeJson.mock.calls[1][2]).toContain('40');
  });

  it('accepts a second attempt that fixes the first', async () => {
    const invented = withBank((value) => {
      value.bank.summaries[0].text = 'Coordinator with 15 years of experience.';
    });
    const completeJson = returning(invented, bank());
    const draft = await importBank(RESUME, { completeJson });
    expect(completeJson).toHaveBeenCalledTimes(2);
    expect(parseBank(draft.resumeYaml).summaries[0].text).toContain('7 years');
  });

  it('does not count ids as invented numbers', async () => {
    const answer = withBank((value) => {
      value.bank.summaries[0].id = 'summary-99';
    });
    await expect(importBank(RESUME, { completeJson: returning(answer) })).resolves.toBeDefined();
  });

  it('checks numeric passthrough fields against the resume text', async () => {
    const withYears = (years: number): Answer =>
      withBank((value) => {
        value.bank.basics.yearsExperience = years;
      });

    const invented = returning(withYears(15), withYears(15));
    const failure = await importBank(RESUME, { completeJson: invented }).catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(ImportValidationError);
    expect((failure as Error).message).toContain('number: 15');
    expect(invented).toHaveBeenCalledTimes(2);

    // 7 is literally in the resume ("7 years"), so the same field passes.
    const draft = await importBank(RESUME, { completeJson: returning(withYears(7)) });
    expect(parseBank(draft.resumeYaml).basics).toMatchObject({ yearsExperience: 7 });
  });

  it('tells the model never to compute durations or totals', () => {
    const prompt = loadSystem('import').replace(/\s+/g, ' ');
    expect(prompt).toContain('Never compute durations or totals; copy numbers exactly as written.');
  });

  it('rejects a bank that breaks the schema, has no summary, or repeats an id', async () => {
    const wrongShape = { profile: {}, bank: { summaries: 'nope' }, personal: '', warnings: [] };
    const noSummary = withBank((value) => {
      value.bank.summaries = [];
    });
    const duplicateId = withBank((value) => {
      value.bank.sections[0].items[0].bullets[1].id = 'exp-northside-b1';
    });
    const topLevelJunk = { ...bank(), bank: { ...bank().bank, extra: 1 } };

    for (const answer of [wrongShape, noSummary, duplicateId, topLevelJunk, 'not an object', null]) {
      const completeJson = returning(answer, answer);
      await expect(importBank(RESUME, { completeJson })).rejects.toBeInstanceOf(ImportValidationError);
      expect(completeJson).toHaveBeenCalledTimes(2);
    }
  });

  it('lets provider errors through untouched', async () => {
    const completeJson = vi.fn().mockRejectedValue(new Error('provider down'));
    await expect(importBank(RESUME, { completeJson })).rejects.toThrow('provider down');
  });
});

async function pdfWith(lines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage();
  lines.forEach((line, index) => page.drawText(line, { x: 40, y: 780 - index * 16, size: 11, font }));
  return doc.save();
}

describe('extractResumeText', () => {
  it('trims pasted text', async () => {
    expect(await extractResumeText({ text: '  hello resume \n' })).toBe('hello resume');
  });

  it('rejects empty and oversized text', async () => {
    await expect(extractResumeText({ text: '   \n' })).rejects.toMatchObject({ status: 400 });
    await expect(extractResumeText({ text: 'x'.repeat(MAX_RESUME_CHARS + 1) })).rejects.toMatchObject({ status: 413 });
    expect(await extractResumeText({ text: 'x'.repeat(MAX_RESUME_CHARS) })).toHaveLength(MAX_RESUME_CHARS);
  });

  it('reads the text layer of a PDF', async () => {
    const text = await extractResumeText({ pdf: await pdfWith(RESUME.split('\n').filter(Boolean)) });
    expect(text).toContain('Jordan Rivera');
    expect(text).toContain('Cut dispatch delays by 30%');
  });

  it('asks for pasted text when the PDF has no text layer', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const error = await extractResumeText({ pdf: await doc.save() }).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ImportInputError);
    expect(error).toMatchObject({ status: 422 });
    expect((error as Error).message).toContain('paste the resume text');
  });

  it('rejects a PDF with more than 20 pages before reading it, and accepts exactly 20', async () => {
    const pages = async (count: number): Promise<Uint8Array> => {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      for (let index = 0; index < count; index += 1) {
        doc.addPage().drawText('Jordan Rivera, operations coordinator, Northside Logistics.', { x: 40, y: 780, size: 11, font });
      }
      return doc.save();
    };

    expect(MAX_PDF_PAGES).toBe(20);
    const error = await extractResumeText({ pdf: await pages(21) }).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ImportInputError);
    expect(error).toMatchObject({ status: 413 });
    expect((error as Error).message).toContain('20 pages');
    expect(await extractResumeText({ pdf: await pages(20) })).toContain('Jordan Rivera');
  });

  it('releases the PDF document after reading it, whether it was read, too long or rejected', async () => {
    const lastDocument = async () => (await vi.mocked(getDocumentProxy).mock.results.at(-1)?.value) as Awaited<ReturnType<typeof getDocumentProxy>>;
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let index = 0; index < 21; index += 1) doc.addPage().drawText('Jordan Rivera, Northside Logistics', { x: 40, y: 780, size: 11, font });

    await extractResumeText({ pdf: await pdfWith(RESUME.split('\n').filter(Boolean)) });
    expect((await lastDocument()).loadingTask.destroyed).toBe(true);
    await extractResumeText({ pdf: await doc.save() }).catch(() => {});
    expect((await lastDocument()).loadingTask.destroyed).toBe(true);
  });

  it('rejects bytes that are not a PDF, a broken PDF and an oversized PDF', async () => {
    await expect(extractResumeText({ pdf: new TextEncoder().encode('hello there') })).rejects.toMatchObject({ status: 400 });
    await expect(extractResumeText({ pdf: new TextEncoder().encode('%PDF-1.7 garbage that is not a pdf') })).rejects.toMatchObject({ status: 400 });
    const big = new Uint8Array(MAX_PDF_BYTES + 1);
    big.set(new TextEncoder().encode('%PDF-'));
    await expect(extractResumeText({ pdf: big })).rejects.toMatchObject({ status: 413 });
  });
});

describe('importResume', () => {
  it('imports from a PDF and from pasted text through the same model call', async () => {
    const lines = RESUME.split('\n').filter(Boolean);
    const fromPdf = await importResume({ pdf: await pdfWith(lines) }, { completeJson: returning(bank()) });
    const fromText = await importResume({ text: RESUME }, { completeJson: returning(bank()) });
    expect(fromPdf.resumeYaml).toBe(fromText.resumeYaml);
  });

  it('never calls the model when the input is bad', async () => {
    const completeJson = returning(bank());
    await expect(importResume({ text: '' }, { completeJson })).rejects.toBeInstanceOf(ImportInputError);
    expect(completeJson).not.toHaveBeenCalled();
  });
});
