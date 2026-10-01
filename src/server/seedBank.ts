import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { parseBank, type Bank } from '../core/bank';

export interface Seed {
  profile: unknown;
  pageTarget: number;
  /** `<profile.yaml>` plus `<personal.md>` flattened for the `<personal>` prompt layer. */
  personalLayer: string;
  bank: Bank;
  bankText: string;
}

/** Load the personal seed bank from a directory holding profile.yaml, resume.yaml and personal.md. */
export function loadSeed(seedDir: string): Seed {
  const profile = parse(readFileSync(join(seedDir, 'profile.yaml'), 'utf8'));
  // Default to one page when pageTarget is absent or not a positive integer.
  const rawTarget = (profile as { pageTarget?: unknown } | null)?.pageTarget;
  const pageTarget =
    typeof rawTarget === 'number' && Number.isInteger(rawTarget) && rawTarget >= 1 ? rawTarget : 1;
  const personal = readFileSync(join(seedDir, 'personal.md'), 'utf8');
  const bankText = readFileSync(join(seedDir, 'resume.yaml'), 'utf8');
  const bank = parseBank(bankText);

  return {
    profile,
    pageTarget,
    personalLayer: `profile.yaml:\n${JSON.stringify(profile, null, 2)}\n\npersonal.md:\n${personal}`,
    bank,
    bankText,
  };
}
