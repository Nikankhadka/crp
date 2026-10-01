import { describe, expect, it } from 'vitest';
import { truncateToBytes } from '../src/core/truncate';

describe('truncateToBytes', () => {
  it('returns short text unchanged', () => {
    expect(truncateToBytes('hello', 100)).toBe('hello');
    expect(truncateToBytes('', 0)).toBe('');
  });

  it('clips at the byte budget and marks the cut', () => {
    const text = 'word '.repeat(100);
    const clipped = truncateToBytes(text, 50);
    expect(clipped.endsWith('… [truncated]')).toBe(true);
    expect(Buffer.byteLength(clipped, 'utf8')).toBeLessThanOrEqual(50);
    expect(clipped.startsWith('word word')).toBe(true);
  });

  it('never splits a multi-byte character', () => {
    const clipped = truncateToBytes('é'.repeat(100), 40);
    expect(clipped).not.toContain('\uFFFD');
    expect(Buffer.byteLength(clipped, 'utf8')).toBeLessThanOrEqual(40);
  });
});
