import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { promisify } from 'node:util';
import type { Bank, BankItem } from '../core/bank';
import type { Tailored } from '../core/schemas';
import { resolvePaths } from '../paths';

const run = promisify(execFile);

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

/** One piece of text and whether the template should render it strong. */
export interface BoldRun {
  text: string;
  bold: boolean;
}

interface RichItem extends Omit<MergedItem, 'text' | 'bullets'> {
  text?: BoldRun[];
  bullets: { id: string; runs: BoldRun[] }[];
}

interface RichSection {
  type: string;
  items: RichItem[];
}

interface RichResume {
  basics: Bank['basics'];
  summary: BoldRun[];
  sections: RichSection[];
  skills: string[];
}

/**
 * Split a string on `**`. Odd segments are bold anchors; even segments stay plain. An unmatched
 * trailing marker (an odd number of markers) is kept literally so nothing is silently dropped.
 */
export function splitBold(text: string): BoldRun[] {
  const parts = text.split('**');
  if (parts.length === 1) return text === '' ? [] : [{ text, bold: false }];

  const pairs = Math.floor((parts.length - 1) / 2);
  const runs: BoldRun[] = [];
  let i = 0;
  for (let pair = 0; pair < pairs; pair += 1) {
    if (parts[i] !== '') runs.push({ text: parts[i], bold: false });
    if (parts[i + 1] !== '') runs.push({ text: parts[i + 1], bold: true });
    i += 2;
  }
  const tail = parts.slice(i).join('**');
  if (tail !== '') runs.push({ text: tail, bold: false });
  return runs;
}

/** Resolve `**` markers into renderable runs for the summary, every bullet and item-level text. */
export function toRich(doc: MergedResume): RichResume {
  return {
    basics: doc.basics,
    summary: splitBold(doc.summary),
    skills: doc.skills,
    sections: doc.sections.map((section) => ({
      type: section.type,
      items: section.items.map((item) => ({
        ...item,
        text: item.text === undefined ? undefined : splitBold(item.text),
        bullets: item.bullets.map((bullet) => ({ id: bullet.id, runs: splitBold(bullet.text) })),
      })),
    })),
  };
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

export interface RenderOptions {
  /** Typst sandbox root; must contain both the template and the output directory. */
  root?: string;
  /** Template path override (tests). */
  templatePath?: string;
  /** Typst binary override. */
  bin?: string;
}

/**
 * Compile a merged doc into `<outDir>/resume.pdf`, writing `<outDir>/resume.json` first.
 * Async so a compile never blocks the server event loop.
 */
export async function renderPdf(
  doc: MergedResume,
  outDir: string,
  options: RenderOptions = {},
): Promise<string> {
  const paths = resolvePaths();
  const root = options.root ?? paths.appRoot;
  const template = options.templatePath ?? join(paths.templatesDir, 'resume.typ');

  mkdirSync(outDir, { recursive: true });
  const dataPath = join(outDir, 'resume.json');
  const pdfPath = join(outDir, 'resume.pdf');
  writeFileSync(dataPath, `${JSON.stringify(toRich(doc), null, 2)}\n`);

  // Typst's `json(sys.inputs.data)` loads the given path itself, scoped to the root set by
  // `--root`. The root-anchored path keeps the sandbox closed: no absolute host path.
  const dataRel = relative(root, dataPath);
  if (dataRel.startsWith('..')) {
    throw new Error(`render output must live under the typst root (${root}); got ${dataPath}`);
  }

  await run(
    options.bin ?? 'typst',
    ['compile', template, pdfPath, '--input', `data=/${dataRel}`, '--root', root],
    { encoding: 'utf8' },
  );
  return pdfPath;
}

/** Count the pages of a PDF with poppler's pdfinfo. */
export async function countPages(pdfPath: string, bin = 'pdfinfo'): Promise<number> {
  const { stdout } = await run(bin, [pdfPath], { encoding: 'utf8' });
  const match = stdout.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error('pdfinfo did not report a page count');
  return Number(match[1]);
}

export interface RenderToTargetDeps {
  /** Injected for tests so the loop runs without Typst. */
  render?: (doc: MergedResume, outDir: string) => string | Promise<string>;
  pageCount?: (pdfPath: string) => number | Promise<number>;
}

export interface RenderResult {
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
 * Render, then shrink until the PDF fits the page target or `maxPasses` shrink attempts are
 * used. It never shrinks below the target. If it is still over target the PDF is kept and the
 * page count returned so the caller can warn instead of throwing.
 */
export async function renderToPageTarget(
  doc: MergedResume,
  outDir: string,
  target = 1,
  maxPasses = 3,
  deps: RenderToTargetDeps = {},
): Promise<RenderResult> {
  const render = deps.render ?? renderPdf;
  const pageCount = deps.pageCount ?? countPages;

  let current = doc;
  let pdfPath = await render(current, outDir);
  let pages = await pageCount(pdfPath);
  let passes = 0;

  while (pages > target && passes < maxPasses) {
    current = dropLastBullets(current);
    pdfPath = await render(current, outDir);
    pages = await pageCount(pdfPath);
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
