import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { ZodError } from 'zod';
import { parseBank, type Bank } from '../core/bank';
import { formatIssues } from '../core/schemas';
import { getDb } from './db';

export interface Seed {
  profile: unknown;
  pageTarget: number;
  /** `<profile.yaml>` plus `<personal.md>` flattened for the `<personal>` prompt layer. */
  personalLayer: string;
  bank: Bank;
  bankText: string;
}

export interface SeedFiles {
  profileYaml: string;
  resumeYaml: string;
  personalMd: string;
}

/** Parse the three seed documents (profile.yaml, resume.yaml, personal.md) into a Seed. */
export function parseSeed({ profileYaml, resumeYaml, personalMd }: SeedFiles): Seed {
  const profile = parse(profileYaml);
  // Default to one page when pageTarget is absent or not a positive integer.
  const rawTarget = (profile as { pageTarget?: unknown } | null)?.pageTarget;
  const pageTarget =
    typeof rawTarget === 'number' && Number.isInteger(rawTarget) && rawTarget >= 1 ? rawTarget : 1;
  const bank = parseBank(resumeYaml);

  return {
    profile,
    pageTarget,
    personalLayer: `profile.yaml:\n${JSON.stringify(profile, null, 2)}\n\npersonal.md:\n${personalMd}`,
    bank,
    bankText: resumeYaml,
  };
}

/** Load the personal seed bank from a directory holding profile.yaml, resume.yaml and personal.md. */
export function loadSeed(seedDir: string): Seed {
  return parseSeed({
    profileYaml: readFileSync(join(seedDir, 'profile.yaml'), 'utf8'),
    resumeYaml: readFileSync(join(seedDir, 'resume.yaml'), 'utf8'),
    personalMd: readFileSync(join(seedDir, 'personal.md'), 'utf8'),
  });
}

/** The user's stored bank documents, or null when they have not imported or saved one. */
export async function getBankTexts(userId: string): Promise<SeedFiles | null> {
  const [row] = await (await getDb()).query<{ profile_yaml: string; resume_yaml: string; personal_md: string }>(
    'select profile_yaml, resume_yaml, personal_md from banks where user_id = $1',
    [userId],
  );
  return row ? { profileYaml: row.profile_yaml, resumeYaml: row.resume_yaml, personalMd: row.personal_md } : null;
}

export async function hasBank(userId: string): Promise<boolean> {
  return (await (await getDb()).query('select 1 from banks where user_id = $1', [userId])).length > 0;
}

/** A bank document that does not parse or validate; `field` says which text to fix. */
export class BankValidationError extends Error {
  constructor(
    message: string,
    readonly field: 'profileYaml' | 'resumeYaml',
  ) {
    super(message);
  }
}

/** Validate the three bank documents the way a generation run will read them. */
export function validateBank(files: SeedFiles): Seed {
  try {
    const profile: unknown = parse(files.profileYaml);
    if (profile === null || typeof profile !== 'object' || Array.isArray(profile)) {
      throw new Error('profile.yaml must be a YAML mapping of key: value lines');
    }
  } catch (err) {
    throw new BankValidationError(err instanceof Error ? err.message : String(err), 'profileYaml');
  }
  try {
    return parseSeed(files);
  } catch (err) {
    throw new BankValidationError(err instanceof ZodError ? formatIssues(err) : String(err instanceof Error ? err.message : err), 'resumeYaml');
  }
}

/** Validate and store (create or replace) the user's bank. Throws BankValidationError. */
export async function saveBank(userId: string, files: SeedFiles): Promise<void> {
  validateBank(files);
  await (await getDb()).query(
    `insert into banks (user_id, profile_yaml, resume_yaml, personal_md) values ($1, $2, $3, $4)
     on conflict (user_id) do update
       set profile_yaml = excluded.profile_yaml, resume_yaml = excluded.resume_yaml,
           personal_md = excluded.personal_md, updated_at = now()`,
    [userId, files.profileYaml, files.resumeYaml, files.personalMd],
  );
}

/** Load a user's seed bank from the database. */
export async function getSeed(userId: string): Promise<Seed> {
  const files = await getBankTexts(userId);
  if (!files) throw new Error('no seed bank for this user');
  return parseSeed(files);
}
