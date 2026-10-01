import { PDFDocument, StandardFonts } from 'pdf-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getBank, PUT as putBankRoute } from '../src/app/api/bank/route';
import { POST as importRoute } from '../src/app/api/bank/import/route';
import { GET as listJobs, POST as createJob } from '../src/app/api/jobs/route';
import { completeJson } from '../src/providers/llm';
import { resetDb } from '../src/server/db';
import { getBankTexts, hasBank } from '../src/server/seedBank';
import { freshDb, putBank, SEED_FILES, type TestDb } from './db-helper';
import { jsonRequest, signInAs, signOut } from './session-helper';

vi.mock('next/headers', async () => ({ cookies: (await import('./session-helper')).cookies }));
vi.mock('next/server', async (importOriginal) => ({ ...(await importOriginal<typeof import('next/server')>()), after: vi.fn() }));
vi.mock('../src/providers/llm', () => ({ completeJson: vi.fn() }));
vi.mock('../src/server/generate', () => ({ runGeneration: vi.fn() }));

const RESUME = 'Jordan Rivera, Operations Coordinator at Northside Logistics. Cut dispatch delays by 30%.';

const draftAnswer = {
  profile: {},
  bank: {
    basics: { name: 'Jordan Rivera' },
    summaries: [{ id: 'summary-1', text: 'Operations Coordinator at Northside Logistics.' }],
    sections: [
      {
        type: 'experience',
        items: [
          {
            id: 'exp-northside',
            title: 'Operations Coordinator',
            org: 'Northside Logistics',
            bullets: [{ id: 'exp-northside-b1', text: 'Cut dispatch delays by 30%.' }],
          },
        ],
      },
    ],
    skills: [],
  },
  personal: '',
  warnings: [],
};

const VALID_BANK = {
  profileYaml: 'pageTarget: 1\n',
  resumeYaml: 'basics:\n  name: Jordan\nsummaries:\n  - id: summary-1\n    text: Coordinator.\nsections: []\nskills: []\n',
  personalMd: '# Personal\n',
};

let t: TestDb;

beforeEach(async () => {
  t = await freshDb();
  process.env.SESSION_SECRET = 'test-secret';
  vi.mocked(completeJson).mockReset();
});

afterEach(async () => {
  signOut();
  await resetDb();
});

const call = async (handler: (request: Request, context: unknown) => Promise<Response>, request: Request) => {
  const response = await handler(request, undefined);
  return { status: response.status, body: (await response.json()) as Record<string, any> };
};

describe('GET /api/bank', () => {
  it('answers 401 without a session', async () => {
    expect((await call(getBank, new Request('http://localhost/api/bank'))).status).toBe(401);
  });

  it('returns null for a user with no bank and the texts for one with a bank', async () => {
    await putBank(t.db, t.userA);
    await signInAs(t.userB);
    expect((await call(getBank, new Request('http://localhost/api/bank'))).body).toEqual({ bank: null });
    await signInAs(t.userA);
    expect((await call(getBank, new Request('http://localhost/api/bank'))).body).toEqual({ bank: SEED_FILES });
  });
});

describe('PUT /api/bank', () => {
  it('saves a valid bank', async () => {
    await signInAs(t.userA);
    expect(await call(putBankRoute, jsonRequest('PUT', VALID_BANK))).toEqual({ status: 200, body: { ok: true } });
    expect(await getBankTexts(t.userA)).toEqual(VALID_BANK);
    expect(await hasBank(t.userB)).toBe(false);
  });

  it('rejects invalid YAML, a bad bank and a non-mapping profile with the offending field, saving nothing', async () => {
    await signInAs(t.userA);
    const cases: Array<[Record<string, string>, string]> = [
      [{ resumeYaml: 'basics: [unclosed' }, 'resumeYaml'],
      [{ resumeYaml: 'summaries: nope\n' }, 'resumeYaml'],
      [{ resumeYaml: 'unknownTop: 1\n' }, 'resumeYaml'],
      [{ profileYaml: '- just\n- a list\n' }, 'profileYaml'],
      [{ profileYaml: 'a: [unclosed' }, 'profileYaml'],
    ];
    for (const [patch, field] of cases) {
      const { status, body } = await call(putBankRoute, jsonRequest('PUT', { ...VALID_BANK, ...patch }));
      expect({ status, field: body.field }).toEqual({ status: 400, field });
      expect(typeof body.error).toBe('string');
    }
    expect(await hasBank(t.userA)).toBe(false);
  });

  it('rejects missing fields, bad JSON and an oversized bank', async () => {
    await signInAs(t.userA);
    expect((await call(putBankRoute, jsonRequest('PUT', { profileYaml: 'a: 1' }))).status).toBe(400);
    expect((await call(putBankRoute, new Request('http://localhost/x', { method: 'PUT', body: 'nope' }))).status).toBe(400);
    expect((await call(putBankRoute, jsonRequest('PUT', { ...VALID_BANK, personalMd: 'x'.repeat(300 * 1024) }))).status).toBe(413);
    expect(await hasBank(t.userA)).toBe(false);
  });

  it('lets user B neither read nor overwrite user A\'s bank', async () => {
    await putBank(t.db, t.userA);
    await signInAs(t.userB);
    expect((await call(getBank, new Request('http://localhost/x'))).body).toEqual({ bank: null });
    await call(putBankRoute, jsonRequest('PUT', VALID_BANK));
    expect(await getBankTexts(t.userA)).toEqual(SEED_FILES);
    expect(await getBankTexts(t.userB)).toEqual(VALID_BANK);
  });

  it('answers 401 without a session', async () => {
    expect((await call(putBankRoute, jsonRequest('PUT', VALID_BANK))).status).toBe(401);
  });
});

describe('POST /api/bank/import', () => {
  it('returns a draft from pasted text (JSON) and saves nothing', async () => {
    vi.mocked(completeJson).mockResolvedValue(draftAnswer);
    await signInAs(t.userB);
    const { status, body } = await call(importRoute, jsonRequest('POST', { text: RESUME }));
    expect(status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(['personalMd', 'profileYaml', 'resumeYaml', 'warnings']);
    expect(body.resumeYaml).toContain('exp-northside');
    expect(await hasBank(t.userB)).toBe(false);
  });

  it('accepts multipart text and a multipart PDF', async () => {
    vi.mocked(completeJson).mockResolvedValue(draftAnswer);
    await signInAs(t.userB);

    const textForm = new FormData();
    textForm.set('text', RESUME);
    expect((await call(importRoute, new Request('http://localhost/x', { method: 'POST', body: textForm }))).status).toBe(200);

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    doc.addPage().drawText(RESUME, { x: 20, y: 700, size: 9, font });
    const form = new FormData();
    form.set('file', new File([Buffer.from(await doc.save())], 'resume.pdf', { type: 'application/pdf' }));
    const fromPdf = await call(importRoute, new Request('http://localhost/x', { method: 'POST', body: form }));
    expect(fromPdf.status).toBe(200);
    expect(fromPdf.body.resumeYaml).toContain('Northside Logistics');
    expect(await hasBank(t.userB)).toBe(false);
  });

  it('answers clear errors for empty input, an image-only PDF, a failed validation and a provider error', async () => {
    await signInAs(t.userB);
    expect((await call(importRoute, jsonRequest('POST', { text: '  ' }))).status).toBe(400);
    expect((await call(importRoute, new Request('http://localhost/x', { method: 'POST', body: 'x', headers: { 'content-type': 'application/json' } }))).status).toBe(400);

    const blank = await PDFDocument.create();
    blank.addPage();
    const form = new FormData();
    form.set('file', new File([Buffer.from(await blank.save())], 'scan.pdf', { type: 'application/pdf' }));
    const scan = await call(importRoute, new Request('http://localhost/x', { method: 'POST', body: form }));
    expect(scan.status).toBe(422);
    expect(scan.body.error).toContain('paste the resume text');

    vi.mocked(completeJson).mockResolvedValue({ profile: {}, bank: { summaries: [] }, personal: '', warnings: [] });
    expect((await call(importRoute, jsonRequest('POST', { text: RESUME }))).status).toBe(422);

    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(completeJson).mockRejectedValue(new Error('upstream secret detail'));
    const failed = await call(importRoute, jsonRequest('POST', { text: RESUME }));
    quiet.mockRestore();
    expect(failed.status).toBe(502);
    expect(JSON.stringify(failed.body)).not.toContain('upstream secret detail');
  });

  it('answers 502 "unreadable output" when the model reply is not JSON, and does not blame the connection', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(completeJson).mockRejectedValue(new SyntaxError('Unexpected token < in JSON at position 0'));
    await signInAs(t.userB);
    const { status, body } = await call(importRoute, jsonRequest('POST', { text: RESUME }));
    quiet.mockRestore();
    expect(status).toBe(502);
    expect(body.error).toContain('unreadable output');
    expect(body.error).not.toContain('could not be reached');
    expect(JSON.stringify(body)).not.toContain('Unexpected token');
  });

  it('rejects a multipart body declared far over the PDF limit before parsing it', async () => {
    await signInAs(t.userB);
    const request = new Request('http://localhost/x', {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(6 * 1024 * 1024) },
      body: '--x--',
    });
    expect((await call(importRoute, request)).status).toBe(413);
  });

  it('answers 401 without a session and never calls the model', async () => {
    expect((await call(importRoute, jsonRequest('POST', { text: RESUME }))).status).toBe(401);
    expect(completeJson).not.toHaveBeenCalled();
  });
});

describe('POST /api/jobs without a bank', () => {
  const job = { jd: 'Coordinator wanted. Run the roster.' };

  it('answers 409 until the user has a bank, then accepts the job', async () => {
    await signInAs(t.userB);
    expect(await call(createJob, jsonRequest('POST', job))).toEqual({
      status: 409,
      body: { error: 'import your resume first' },
    });
    expect((await call(listJobs, new Request('http://localhost/x'))).body).toEqual({ jobs: [] });

    await call(putBankRoute, jsonRequest('PUT', VALID_BANK));
    const accepted = await call(createJob, jsonRequest('POST', job));
    expect(accepted.status).toBe(202);
    expect((await call(listJobs, new Request('http://localhost/x'))).body.jobs).toHaveLength(1);

    await signInAs(t.userA);
    expect((await call(listJobs, new Request('http://localhost/x'))).body).toEqual({ jobs: [] });
  });
});
