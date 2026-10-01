// Download the pinned static typst binary for linux x86_64 into bin/typst-linux-x64 so a
// serverless deploy (no typst on PATH) can render. Run by `vercel-build`; skips when the binary
// is present and its version stamp matches the pinned version and hash.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.15.1';
const ASSET = 'typst-x86_64-unknown-linux-musl';
// sha256 of the release asset below, as published by GitHub for v0.15.1.
const SHA256 = 'a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c';
const url = `https://github.com/typst/typst/releases/download/v${VERSION}/${ASSET}.tar.xz`;

const binDir = fileURLToPath(new URL('../bin/', import.meta.url));
const target = join(binDir, 'typst-linux-x64');
// Not named after the binary: the `bin/typst-linux-x64` trace include also picks up `typst-linux-x64*`.
const stampPath = join(binDir, '.typst-version');
const stamp = `${VERSION} ${SHA256}`;

if (existsSync(target) && existsSync(stampPath) && readFileSync(stampPath, 'utf8').trim() === stamp) {
  console.log(`typst ${VERSION} already present at ${target}, skipping`);
  process.exit(0);
}

// A binary without a matching stamp is stale or unknown: drop it so a failed run leaves none.
rmSync(target, { force: true });
rmSync(stampPath, { force: true });

const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
if (!response.ok) throw new Error(`download failed: ${response.status} ${url}`);
const archive = Buffer.from(await response.arrayBuffer());

const actual = createHash('sha256').update(archive).digest('hex');
if (actual !== SHA256) throw new Error(`sha256 mismatch for ${url}: expected ${SHA256}, got ${actual}`);

const work = mkdtempSync(join(tmpdir(), 'fetch-typst-'));
try {
  const archivePath = join(work, `${ASSET}.tar.xz`);
  writeFileSync(archivePath, archive);
  mkdirSync(binDir, { recursive: true });
  // Extract only the executable, into bin/ so the final rename stays on one filesystem.
  execFileSync('tar', ['-xJf', archivePath, '--strip-components=1', '-C', binDir, `${ASSET}/typst`]);
  renameSync(join(binDir, 'typst'), target);
  chmodSync(target, 0o755);
  writeFileSync(stampPath, `${stamp}\n`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
console.log(`typst ${VERSION} written to ${target}`);
