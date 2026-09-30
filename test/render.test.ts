import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseBank, type Bank } from '../src/core/bank.js';
import type { Tailored } from '../src/core/schemas.js';
import {
  countPages,
  mergeResume,
  renderOnePage,
  renderPdf,
  slugify,
  type MergedResume,
} from '../src/render/typst.js';

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

describe('renderOnePage', () => {
  it('drops bullets one pass at a time until the page count is 1', () => {
    const seen: MergedResume[] = [];
    let call = 0;
    const pages = [2, 1];

    const result = renderOnePage(doc, '/tmp/out', 3, {
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

  it('stops at maxPasses and returns the page count instead of throwing', () => {
    let calls = 0;
    const result = renderOnePage(doc, '/tmp/out', 2, {
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

function hasCommand(command: string, args: string[]): boolean {
  try {
    execFileSync(command, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const hasTypst = hasCommand('typst', ['--version']);
const hasPdfinfo = hasCommand('pdfinfo', ['-v']);
const maybe = hasTypst && hasPdfinfo ? describe : describe.skip;

maybe('typst integration', () => {
  it('renders the fixture document to a one-page PDF', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'cpilot-render-'));
    try {
      const pdfPath = renderPdf(doc, outDir);
      expect(existsSync(pdfPath)).toBe(true);
      expect(countPages(pdfPath)).toBe(1);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  }, 60_000);
});
