import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { score } from './core/score.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

async function main(): Promise<void> {
  const [command, jdPath] = process.argv.slice(2);
  if (command !== 'score' || !jdPath) {
    process.stderr.write('Usage: tsx src/cli.ts score <path-to-jd-file>\n');
    process.exit(1);
  }

  const seedDir = join(repoRoot, 'seed', 'me');
  const profile = parse(readFileSync(join(seedDir, 'profile.yaml'), 'utf8'));
  const personal = readFileSync(join(seedDir, 'personal.md'), 'utf8');
  const bank = readFileSync(join(seedDir, 'resume.yaml'), 'utf8');
  const job = readFileSync(jdPath, 'utf8');

  const personalLayer = `profile.yaml:\n${JSON.stringify(profile, null, 2)}\n\npersonal.md:\n${personal}`;

  const result = await score({
    personal: personalLayer,
    bank,
    job,
    descriptionIsFull: true,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
