import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const blocked = [
  'nurse',
  'nursing',
  'aged care',
  'software',
  'engineer',
  'developer',
  'hospitality',
  'retail',
  'electrician',
  'teacher',
];

describe('prompts/base vocabulary', () => {
  const dir = 'prompts/base';
  const files = readdirSync(dir).filter((file) => file.endsWith('.md'));

  it('has at least one prompt file', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} stays job-agnostic`, () => {
      const text = readFileSync(join(dir, file), 'utf8').toLowerCase();
      for (const word of blocked) expect(text).not.toContain(word);
    });
  }
});
