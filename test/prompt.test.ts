import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPrompt } from '../src/core/prompt.js';

describe('buildPrompt', () => {
  it('includes the personal, bank and job tags', () => {
    const { user } = buildPrompt({ task: 'score', personal: 'P', bank: 'B', job: 'J' });
    expect(user).toContain('<personal>\nP\n</personal>');
    expect(user).toContain('<bank>\nB\n</bank>');
    expect(user).toContain('<job>\nJ\n</job>');
  });

  it('omits research entirely when absent', () => {
    const { user } = buildPrompt({ task: 'score', personal: 'P', bank: 'B', job: 'J' });
    expect(user).not.toContain('<research>');
  });

  it('includes research when present', () => {
    const { user } = buildPrompt({ task: 'score', personal: 'P', bank: 'B', research: 'R', job: 'J' });
    expect(user).toContain('<research>\nR\n</research>');
  });

  it('system equals the concatenation of the two base files', () => {
    const system = readFileSync('prompts/base/system.md', 'utf8');
    const task = readFileSync('prompts/base/score.md', 'utf8');
    expect(buildPrompt({ task: 'score', personal: 'P', bank: 'B', job: 'J' }).system).toBe(
      system + task,
    );
  });
});
