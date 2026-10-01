import { resolve } from 'node:path';

export interface Paths {
  appRoot: string;
  promptsDir: string;
  templatesDir: string;
  seedDir: string;
  storageDir: string;
  jobsDir: string;
  docsDir: string;
  tracesDir: string;
}

function envPath(name: string, fallback: string): string {
  const value = process.env[name];
  return resolve(value && value.trim() !== '' ? value : fallback);
}

/**
 * Runtime paths, derived from APP_ROOT (default: cwd) so the CLI, tests and the Docker
 * standalone server all resolve the same directories. Storage defaults to `<appRoot>/storage`.
 */
export function resolvePaths(): Paths {
  const appRoot = envPath('APP_ROOT', process.cwd());
  const storageDir = envPath('STORAGE_DIR', resolve(appRoot, 'storage'));
  return {
    appRoot,
    promptsDir: resolve(appRoot, 'prompts', 'base'),
    templatesDir: resolve(appRoot, 'templates'),
    seedDir: envPath('SEED_DIR', resolve(appRoot, 'seed', 'me')),
    storageDir,
    jobsDir: resolve(storageDir, 'jobs'),
    docsDir: envPath('DOCS_DIR', resolve(storageDir, 'docs')),
    tracesDir: resolve(storageDir, 'traces'),
  };
}
