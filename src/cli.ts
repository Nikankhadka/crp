import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { parseBank } from './core/bank.js';
import { score } from './core/score.js';
import { tailor } from './core/tailor.js';
import { mergeResume, renderToPageTarget, slugify } from './render/typst.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const USAGE =
  'Usage: tsx src/cli.ts <jd-file>\n' +
  '       tsx src/cli.ts <score|tailor> <jd-file>\n';

async function main(): Promise<void> {
  const [first, second] = process.argv.slice(2);
  const isSubcommand = first === 'score' || first === 'tailor';
  const command = isSubcommand ? first : 'render';
  const jdPath = isSubcommand ? second : first;
  if (!jdPath) {
    process.stderr.write(USAGE);
    process.exit(1);
  }

  const seedDir = join(repoRoot, 'seed', 'me');
  const profile = parse(readFileSync(join(seedDir, 'profile.yaml'), 'utf8'));
  // Default to one page when pageTarget is absent or not a positive integer.
  const rawTarget = profile?.pageTarget;
  const pageTarget =
    typeof rawTarget === 'number' && Number.isInteger(rawTarget) && rawTarget >= 1 ? rawTarget : 1;
  const personal = readFileSync(join(seedDir, 'personal.md'), 'utf8');
  const bankText = readFileSync(join(seedDir, 'resume.yaml'), 'utf8');
  const bank = parseBank(bankText);
  const job = readFileSync(jdPath, 'utf8');

  const personalLayer = `profile.yaml:\n${JSON.stringify(profile, null, 2)}\n\npersonal.md:\n${personal}`;

  const scored = await score({ personal: personalLayer, bank: bankText, job, descriptionIsFull: true });

  if (command === 'score') {
    process.stdout.write(`${JSON.stringify(scored, null, 2)}\n`);
    return;
  }

  const tailored = await tailor({
    personal: personalLayer,
    bank,
    bankText,
    job,
    score: scored,
    descriptionIsFull: true,
  });

  if (command === 'tailor') {
    process.stdout.write(`${JSON.stringify({ score: scored, tailored }, null, 2)}\n`);
    return;
  }

  const doc = mergeResume(tailored, bank);
  const outDir = join(repoRoot, 'out', 'local', slugify(jdPath), 'v1');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'score.json'), `${JSON.stringify(scored, null, 2)}\n`);
  if (tailored.coverLetter) {
    writeFileSync(join(outDir, 'cover-letter.md'), `${tailored.coverLetter}\n`);
  }

  const { pages, passes } = renderToPageTarget(doc, outDir, pageTarget);

  process.stdout.write(
    [
      `score: ${scored.score}`,
      `gaps: ${tailored.gaps.length > 0 ? tailored.gaps.join('; ') : 'none'}`,
      `output: ${outDir}`,
      `pages: ${pages}${passes > 0 ? ` (after ${passes} shrink pass${passes === 1 ? '' : 'es'})` : ''}`,
    ].join('\n') + '\n',
  );
  if (pages > pageTarget) {
    process.stderr.write(
      `warning: resume is ${pages} pages after ${passes} shrink passes (target ${pageTarget})\n`,
    );
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
