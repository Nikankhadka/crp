import { afterEach, describe, expect, it } from 'vitest';
import { resolvePaths } from '../src/paths';

const ORIGINAL = { ...process.env };

afterEach(() => {
  for (const key of ['APP_ROOT', 'STORAGE_DIR', 'SEED_DIR']) {
    if (ORIGINAL[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL[key];
  }
});

describe('resolvePaths', () => {
  it('defaults to cwd with storage inside the app root', () => {
    delete process.env.APP_ROOT;
    delete process.env.STORAGE_DIR;
    delete process.env.SEED_DIR;
    const paths = resolvePaths();
    expect(paths.appRoot).toBe(process.cwd());
    expect(paths.storageDir).toBe(`${process.cwd()}/storage`);
    expect(paths.tracesDir).toBe(`${process.cwd()}/storage/traces`);
    expect(paths.seedDir).toBe(`${process.cwd()}/seed/me`);
    expect(paths.promptsDir).toBe(`${process.cwd()}/prompts/base`);
  });

  it('honours env overrides', () => {
    process.env.APP_ROOT = '/srv/app';
    delete process.env.STORAGE_DIR;
    process.env.SEED_DIR = '/data/seed';
    const paths = resolvePaths();
    expect(paths.appRoot).toBe('/srv/app');
    expect(paths.storageDir).toBe('/srv/app/storage');
    expect(paths.seedDir).toBe('/data/seed');
  });

  it('treats empty env values as unset', () => {
    process.env.APP_ROOT = '';
    const paths = resolvePaths();
    expect(paths.appRoot).toBe(process.cwd());
  });
});
