import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { parseBank, type Bank } from '../src/core/bank';
import type { Tailored } from '../src/core/schemas';
import {
  countPages,
  mergeResume,
  renderPdf,
  renderToPageTarget,
  resolveTypstBin,
  slugify,
  splitBold,
  type MergedResume,
} from '../src/render/typst';
import { hasCommand } from './helpers';

const bank: Bank = parseBank(`
basics:
  name: Test Person
  location: Sydney, Australia
  email: test@example.com
summaries:
  - id: summary-01
    text: Source summary text.
sections:
  - type: experience
    items:
      - id: exp-one
        title: Developer
        org: Bank Co
        start: Jan 2020
        end: Present
        tech: [TypeScript, PostgreSQL]
        bullets:
          - id: exp-one-01
            text: Built a platform used by about 20 clients.
          - id: exp-one-02
            text: Shipped an API with Node.js.
      - id: exp-two
        title: Analyst
        org: Other Co
        bullets:
          - id: exp-two-01
            text: Wrote weekly reports.
  - type: awards
    items:
      - id: award-one
        title: A prize
        text: Won a prize for a prototype.
skills:
  - id: skill-tech
    category: Programming
    items: [TypeScript, SQL]
`);

// `org` and `title` are not in TailorSchema; the cast proves they cannot leak into the merge.
const tailored = {
  summaryId: 'summary-01',
  summaryRewrite: 'Rewritten summary.',
  sections: [
    {
      type: 'experience',
      items: [
        {
          itemId: 'exp-one',
          org: 'Evil Co',
          title: 'Fabricated Title',
          bullets: [
            { sourceId: 'exp-one-01', text: 'Tailored bullet one.' },
            { sourceId: 'exp-one-02', text: 'Tailored bullet two.' },
          ],
        },
        { itemId: 'exp-two', bullets: [{ sourceId: 'exp-two-01', text: 'Tailored analyst bullet.' }] },
      ],
    },
    { type: 'awards', items: [{ itemId: 'award-one', bullets: [] }] },
  ],
  skillsOrder: ['SQL', 'TypeScript'],
  gaps: [],
} as unknown as Tailored;

const doc = mergeResume(tailored, bank);

describe('mergeResume', () => {
  it('resolves org, title, dates, tech and item text from the bank', () => {
    expect(doc.basics.email).toBe('test@example.com');
    expect(doc.summary).toBe('Rewritten summary.');
    expect(doc.skills).toEqual(['SQL', 'TypeScript']);

    const experience = doc.sections[0];
    expect(experience.type).toBe('experience');
    const item = experience.items[0];
    expect(item.org).toBe('Bank Co');
    expect(item.title).toBe('Developer');
    expect(item.start).toBe('Jan 2020');
    expect(item.end).toBe('Present');
    expect(item.tech).toEqual(['TypeScript', 'PostgreSQL']);
    expect(item.bullets).toEqual([
      { id: 'exp-one-01', text: 'Tailored bullet one.' },
      { id: 'exp-one-02', text: 'Tailored bullet two.' },
    ]);

    expect(doc.sections[1].items[0].text).toBe('Won a prize for a prototype.');
  });
});

describe('splitBold', () => {
  it('returns a single plain run when there are no markers', () => {
    expect(splitBold('Built the thing')).toEqual([{ text: 'Built the thing', bold: false }]);
  });

  it('bolds the odd segment for one pair of markers', () => {
    expect(splitBold('cut **70%+** in effort')).toEqual([
      { text: 'cut ', bold: false },
      { text: '70%+', bold: true },
      { text: ' in effort', bold: false },
    ]);
  });

  it('bolds every odd segment for multiple pairs', () => {
    expect(splitBold('**a** and **b**')).toEqual([
      { text: 'a', bold: true },
      { text: ' and ', bold: false },
      { text: 'b', bold: true },
    ]);
  });

  it('keeps an unmatched marker literal without throwing', () => {
    expect(splitBold('cut **70%')).toEqual([{ text: 'cut **70%', bold: false }]);
  });

  it('returns no runs for an empty string', () => {
    expect(splitBold('')).toEqual([]);
  });
});

describe('renderToPageTarget', () => {
  it('target 1 drops bullets one pass at a time until the page count is 1', async () => {
    const seen: MergedResume[] = [];
    let call = 0;
    const pages = [2, 1];

    const result = await renderToPageTarget(doc, '/tmp/out', 1, 3, {
      render: (current) => {
        seen.push(structuredClone(current));
        return `/tmp/out/pdf-${call++}`;
      },
      pageCount: () => pages.shift() ?? 1,
    });

    expect(result).toEqual({ pages: 1, passes: 1, pdfPath: '/tmp/out/pdf-1' });
    expect(seen).toHaveLength(2);
    expect(seen[0].sections[0].items[0].bullets).toHaveLength(2);
    // The 2-bullet item lost its last bullet; the 1-bullet item is untouched.
    expect(seen[1].sections[0].items[0].bullets).toEqual([
      { id: 'exp-one-01', text: 'Tailored bullet one.' },
    ]);
    expect(seen[1].sections[0].items[1].bullets).toHaveLength(1);
  });

  it('target 2 does zero shrink passes when the render is already 2 pages', async () => {
    let calls = 0;
    const result = await renderToPageTarget(doc, '/tmp/out', 2, 3, {
      render: () => `/tmp/out/pdf-${calls++}`,
      pageCount: () => 2,
    });

    expect(result).toEqual({ pages: 2, passes: 0, pdfPath: '/tmp/out/pdf-0' });
    expect(calls).toBe(1);
  });

  it('target 2 shrinks once when the render is 3 pages', async () => {
    let calls = 0;
    const pages = [3, 2];
    const result = await renderToPageTarget(doc, '/tmp/out', 2, 3, {
      render: () => `/tmp/out/pdf-${calls++}`,
      pageCount: () => pages.shift() ?? 2,
    });

    expect(result).toEqual({ pages: 2, passes: 1, pdfPath: '/tmp/out/pdf-1' });
    expect(calls).toBe(2);
  });

  it('stops at maxPasses and returns the page count instead of throwing', async () => {
    let calls = 0;
    const result = await renderToPageTarget(doc, '/tmp/out', 1, 2, {
      render: () => `/tmp/out/pdf-${calls++}`,
      pageCount: () => 2,
    });

    expect(result).toEqual({ pages: 2, passes: 2, pdfPath: '/tmp/out/pdf-2' });
    expect(calls).toBe(3);
  });
});

describe('slugify', () => {
  it('sanitizes a job file name into a folder name', () => {
    expect(slugify('test/fixtures/Senior Frontend Dev!!.txt')).toBe('senior-frontend-dev');
    expect(slugify('/Users/me/JD  FILE.md')).toBe('jd-file');
    expect(slugify('/tmp/___.pdf')).toBe('job');
  });
});

/** A fresh scratch dir under the OS temp dir; the caller removes it. */
function scratchDir(): string {
  return mkdtempSync(join(tmpdir(), 'render-test-'));
}

async function writePdf(path: string, pages: number): Promise<void> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) pdf.addPage();
  writeFileSync(path, await pdf.save());
}

describe('countPages', () => {
  it('counts the pages of a PDF without any system tool', async () => {
    const dir = scratchDir();
    try {
      await writePdf(join(dir, 'one.pdf'), 1);
      await writePdf(join(dir, 'three.pdf'), 3);
      expect(await countPages(join(dir, 'one.pdf'))).toBe(1);
      expect(await countPages(join(dir, 'three.pdf'))).toBe(3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a file that is not a PDF', async () => {
    const dir = scratchDir();
    try {
      writeFileSync(join(dir, 'bad.pdf'), 'not a pdf');
      await expect(countPages(join(dir, 'bad.pdf'))).rejects.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('resolveTypstBin', () => {
  const bundledApp = (): string => {
    const appRoot = scratchDir();
    mkdirSync(join(appRoot, 'bin'));
    writeFileSync(join(appRoot, 'bin', 'typst-linux-x64'), 'fake typst', { mode: 0o644 });
    return appRoot;
  };

  it('prefers TYPST_BIN over everything', () => {
    const appRoot = bundledApp();
    try {
      const bin = resolveTypstBin({ env: { TYPST_BIN: '/opt/typst' }, platform: 'linux', appRoot });
      expect(bin).toBe('/opt/typst');
    } finally {
      rmSync(appRoot, { recursive: true, force: true });
    }
  });

  it('copies the bundled linux binary into a private temp dir, executable, and reuses the copy', () => {
    const appRoot = bundledApp();
    const tmpDir = scratchDir();
    try {
      const deps = { env: {}, platform: 'linux' as const, appRoot, tmpDir };
      const bin = resolveTypstBin(deps);
      expect(dirname(bin)).not.toBe(tmpDir);
      expect(dirname(dirname(bin))).toBe(tmpDir);
      expect(basename(bin)).toBe('typst-linux-x64');
      expect(readFileSync(bin, 'utf8')).toBe('fake typst');
      expect(statSync(bin).mode & 0o777).toBe(0o755);

      // The cached path is reused: a changed source is not copied again.
      writeFileSync(join(appRoot, 'bin', 'typst-linux-x64'), 'changed');
      expect(resolveTypstBin(deps)).toBe(bin);
      expect(readFileSync(bin, 'utf8')).toBe('fake typst');

      // If the copy vanishes (temp dir cleaned), a fresh private dir is made.
      rmSync(dirname(bin), { recursive: true });
      const again = resolveTypstBin(deps);
      expect(again).not.toBe(bin);
      expect(dirname(dirname(again))).toBe(tmpDir);
      expect(readFileSync(again, 'utf8')).toBe('changed');
      expect(statSync(again).mode & 0o777).toBe(0o755);
    } finally {
      rmSync(appRoot, { recursive: true, force: true });
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('falls back to typst on PATH when not linux or when nothing is bundled', () => {
    const appRoot = bundledApp();
    const empty = scratchDir();
    try {
      expect(resolveTypstBin({ env: {}, platform: 'darwin', appRoot })).toBe('typst');
      expect(resolveTypstBin({ env: {}, platform: 'linux', appRoot: empty })).toBe('typst');
    } finally {
      rmSync(appRoot, { recursive: true, force: true });
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

const boldDoc: MergedResume = {
  ...doc,
  summary: 'Rewritten **summary** marker.',
  sections: doc.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      bullets: item.bullets.map((bullet, index) =>
        index === 0 ? { ...bullet, text: 'Tailored **bullet** one.' } : bullet,
      ),
    })),
  })),
};

describe('renderPdf', () => {
  it('compiles from a copy of the template inside outDir, with outDir as the typst root', async () => {
    const dir = scratchDir();
    try {
      const outDir = join(dir, 'out');
      const bin = join(dir, 'fake-typst');
      writeFileSync(bin, `#!/bin/sh\nprintf '%s\\n' "$@" > "${join(dir, 'args.txt')}"\n`);
      chmodSync(bin, 0o755);

      const pdfPath = await renderPdf(boldDoc, outDir, { bin });

      expect(pdfPath).toBe(join(outDir, 'resume.pdf'));
      expect(existsSync(join(outDir, 'resume.typ'))).toBe(true);

      // Typst renders the JSON text verbatim, so no `**` in the data means none in the PDF.
      const raw = readFileSync(join(outDir, 'resume.json'), 'utf8');
      expect(raw).not.toContain('**');
      const data = JSON.parse(raw);
      expect(data.basics.name).toBe('Test Person');
      expect(data.summary).toEqual([
        { text: 'Rewritten ', bold: false },
        { text: 'summary', bold: true },
        { text: ' marker.', bold: false },
      ]);
      expect(data.sections[0].items[0].bullets[0].runs).toEqual([
        { text: 'Tailored ', bold: false },
        { text: 'bullet', bold: true },
        { text: ' one.', bold: false },
      ]);
      expect(readFileSync(join(dir, 'args.txt'), 'utf8').trim().split('\n')).toEqual([
        'compile',
        join(outDir, 'resume.typ'),
        pdfPath,
        '--input',
        'data=/resume.json',
        '--root',
        outDir,
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

const maybe = hasCommand(resolveTypstBin(), ['--version']) ? describe : describe.skip;

maybe('typst integration', () => {
  it('renders into the OS temp dir and fits one page', async () => {
    const outDir = scratchDir();
    try {
      const pdfPath = await renderPdf(boldDoc, outDir);
      expect(existsSync(pdfPath)).toBe(true);
      expect(await countPages(pdfPath)).toBe(1);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  }, 60_000);
});
