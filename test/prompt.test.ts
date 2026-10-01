import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPrompt } from '../src/core/prompt';

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

  it('omits docs entirely when absent', () => {
    const { user } = buildPrompt({ task: 'score', personal: 'P', bank: 'B', job: 'J' });
    expect(user).not.toContain('<docs>');
  });

  it('places docs between bank and research, before the job', () => {
    const { user } = buildPrompt({
      task: 'score',
      personal: 'P',
      bank: 'B',
      docs: 'D',
      research: 'R',
      job: 'J',
    });
    expect(user).toContain('<docs>\nD\n</docs>');
    expect(user.indexOf('<bank>')).toBeLessThan(user.indexOf('<docs>'));
    expect(user.indexOf('<docs>')).toBeLessThan(user.indexOf('<research>'));
    expect(user.indexOf('<research>')).toBeLessThan(user.indexOf('<job>'));
  });

  it('system equals the concatenation of the two base files', () => {
    const system = readFileSync('prompts/base/system.md', 'utf8');
    const task = readFileSync('prompts/base/score.md', 'utf8');
    expect(buildPrompt({ task: 'score', personal: 'P', bank: 'B', job: 'J' }).system).toBe(
      system + task,
    );
  });
});
