import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { parseBank } from './core/bank.js';
import { score } from './core/score.js';
import { tailor } from './core/tailor.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

async function main(): Promise<void> {
  const [command, jdPath] = process.argv.slice(2);
  if ((command !== 'score' && command !== 'tailor') || !jdPath) {
    process.stderr.write('Usage: tsx src/cli.ts <score|tailor> <path-to-jd-file>\n');
    process.exit(1);
  }

  const seedDir = join(repoRoot, 'seed', 'me');
  const profile = parse(readFileSync(join(seedDir, 'profile.yaml'), 'utf8'));
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

  process.stdout.write(`${JSON.stringify({ score: scored, tailored }, null, 2)}\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
