import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { score } from './core/score';
import { tailor } from './core/tailor';
import { resolvePaths } from './paths';
import { mergeResume, renderToPageTarget, slugify } from './render/typst';
import { loadSeed } from './server/seedBank';

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

  const paths = resolvePaths();
  const seed = loadSeed(paths.seedDir);
  const job = readFileSync(jdPath, 'utf8');

  const scored = await score({
    personal: seed.personalLayer,
    bank: seed.bankText,
    job,
    descriptionIsFull: true,
  });

  if (command === 'score') {
    process.stdout.write(`${JSON.stringify(scored, null, 2)}\n`);
    return;
  }

  const tailored = await tailor({
    personal: seed.personalLayer,
    bank: seed.bank,
    bankText: seed.bankText,
    job,
    score: scored,
    descriptionIsFull: true,
  });

  if (command === 'tailor') {
    process.stdout.write(`${JSON.stringify({ score: scored, tailored }, null, 2)}\n`);
    return;
  }

  const doc = mergeResume(tailored, seed.bank);
  const outDir = join(paths.appRoot, 'out', 'local', slugify(jdPath), 'v1');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'score.json'), `${JSON.stringify(scored, null, 2)}\n`);
  if (tailored.coverLetter) {
    writeFileSync(join(outDir, 'cover-letter.md'), `${tailored.coverLetter}\n`);
  }

  const { pages, passes } = await renderToPageTarget(doc, outDir, seed.pageTarget);

  process.stdout.write(
    [
      `score: ${scored.score}`,
      `gaps: ${tailored.gaps.length > 0 ? tailored.gaps.join('; ') : 'none'}`,
      `output: ${outDir}`,
      `pages: ${pages}${passes > 0 ? ` (after ${passes} shrink pass${passes === 1 ? '' : 'es'})` : ''}`,
    ].join('\n') + '\n',
  );
  if (pages > seed.pageTarget) {
    process.stderr.write(
      `warning: resume is ${pages} pages after ${passes} shrink passes (target ${seed.pageTarget})\n`,
    );
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
