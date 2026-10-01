import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { parseBank, type Bank } from '../core/bank';
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

/** Load a user's seed bank from the database. */
export async function getSeed(userId: string): Promise<Seed> {
  const [row] = await (await getDb()).query<{ profile_yaml: string; resume_yaml: string; personal_md: string }>(
    'select profile_yaml, resume_yaml, personal_md from banks where user_id = $1',
    [userId],
  );
  if (!row) throw new Error('no seed bank for this user');
  return parseSeed({ profileYaml: row.profile_yaml, resumeYaml: row.resume_yaml, personalMd: row.personal_md });
}
