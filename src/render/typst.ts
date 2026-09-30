import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Bank, BankItem } from '../core/bank.js';
import type { Tailored } from '../core/schemas.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const templatePath = join(repoRoot, 'templates', 'resume.typ');

export interface MergedBullet {
  id: string;
  text: string;
}

export interface MergedItem {
  id: string;
  title?: string;
  org?: string;
  name?: string;
  institution?: string;
  credential?: string;
  context?: string;
  start?: string;
  end?: string;
  tech?: string[];
  /** Item-level bank fact, rendered for bullet-less entries. Never rewritten by the model. */
  text?: string;
  bullets: MergedBullet[];
}

export interface MergedSection {
  type: string;
  items: MergedItem[];
}

export interface MergedResume {
  basics: Bank['basics'];
  summary: string;
  sections: MergedSection[];
  skills: string[];
}

/**
 * Resolve a tailored result into the plain document the Typst template renders. Org, title,
 * name, credentials and dates always come from the bank, never from the model; only the
 * summary rewrite and bullet texts come from the tailored output.
 */
export function mergeResume(tailored: Tailored, bank: Bank): MergedResume {
  const itemById = new Map<string, BankItem>();
  for (const section of bank.sections) {
    for (const item of section.items) itemById.set(item.id, item);
  }

  const sections: MergedSection[] = tailored.sections.map((section) => ({
    type: section.type,
    items: section.items.map((entry) => {
      const item = itemById.get(entry.itemId);
      return {
        id: entry.itemId,
        title: item?.title,
        org: item?.org,
        name: item?.name,
        institution: item?.institution,
        credential: item?.credential,
        context: item?.context,
        start: item?.start,
        end: item?.end,
        tech: item?.tech,
        text: item?.text,
        bullets: entry.bullets.map((bullet) => ({ id: bullet.sourceId, text: bullet.text })),
      };
    }),
  }));

  return {
    basics: bank.basics,
    summary: tailored.summaryRewrite,
    sections,
    skills: tailored.skillsOrder,
  };
}

/** Compile a merged doc into `<outDir>/resume.pdf`, writing `<outDir>/resume.json` first. */
export function renderPdf(doc: MergedResume, outDir: string): string {
  mkdirSync(outDir, { recursive: true });
  const dataPath = join(outDir, 'resume.json');
  const pdfPath = join(outDir, 'resume.pdf');
  writeFileSync(dataPath, `${JSON.stringify(doc, null, 2)}\n`);

  // Typst's `json(sys.inputs.data)` loads the given path itself, scoped to the project root set
  // by `--root`. A root-anchored path keeps the repo as the sandbox: no `--root /`, no absolute
  // host path. Data lives under out/ inside the repo, so the repo-relative path is valid.
  execFileSync(
    'typst',
    [
      'compile',
      templatePath,
      pdfPath,
      '--input',
      `data=/${relative(repoRoot, dataPath)}`,
      '--root',
      repoRoot,
    ],
    { stdio: 'pipe' },
  );
  return pdfPath;
}

/** Count the pages of a PDF with poppler's pdfinfo. */
export function countPages(pdfPath: string): number {
  const output = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  const match = output.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error('pdfinfo did not report a page count');
  return Number(match[1]);
}

export interface RenderOnePageDeps {
  /** Injected for tests so the loop runs without Typst. */
  render?: (doc: MergedResume, outDir: string) => string;
  pageCount?: (pdfPath: string) => number;
}

export interface OnePageResult {
  pages: number;
  passes: number;
  pdfPath: string;
}

/** Drop the last bullet of every item that still has two or more bullets. */
function dropLastBullets(doc: MergedResume): MergedResume {
  return {
    ...doc,
    sections: doc.sections.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.bullets.length >= 2 ? { ...item, bullets: item.bullets.slice(0, -1) } : item,
      ),
    })),
  };
}

/**
 * Render, then shrink until the PDF fits one page or `maxPasses` shrink attempts are used.
 * If it is still over one page the PDF is kept and the page count returned so the caller
 * can warn instead of throwing.
 */
export function renderOnePage(
  doc: MergedResume,
  outDir: string,
  maxPasses = 3,
  deps: RenderOnePageDeps = {},
): OnePageResult {
  const render = deps.render ?? renderPdf;
  const pageCount = deps.pageCount ?? countPages;

  let current = doc;
  let pdfPath = render(current, outDir);
  let pages = pageCount(pdfPath);
  let passes = 0;

  while (pages > 1 && passes < maxPasses) {
    current = dropLastBullets(current);
    pdfPath = render(current, outDir);
    pages = pageCount(pdfPath);
    passes += 1;
  }

  return { pages, passes, pdfPath };
}

/** Turn a job-description file name into a safe output folder name. */
export function slugify(filePath: string): string {
  const base = basename(filePath).replace(/\.[^.]+$/, '');
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'job';
}
