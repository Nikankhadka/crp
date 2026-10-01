import { describe, expect, it } from 'vitest';
import type { Bank } from '../src/core/bank';
import { buildDocx } from '../src/render/docx';
import { contactLine, itemHeadline } from '../src/render/layout';
import type { MergedItem, MergedResume } from '../src/render/typst';

const basics: Bank['basics'] = {
  name: 'Test Person',
  location: 'Sydney, Australia',
  phone: '0400 000 000',
  email: 'test@example.com',
  linkedin: 'linkedin.com/in/test',
};

const item: MergedItem = {
  id: 'exp-one',
  title: 'Developer',
  org: 'Bank Co',
  start: 'Jan 2020',
  end: 'Present',
  tech: ['TypeScript', 'PostgreSQL'],
  bullets: [{ id: 'exp-one-01', text: 'Built a **platform** used by 20 clients.' }],
};

const doc: MergedResume = {
  basics,
  summary: 'Rewritten **summary**.',
  sections: [{ type: 'experience', items: [item] }],
  skills: ['TypeScript', 'SQL'],
};

describe('contactLine', () => {
  it('joins present basics fields with a pipe in order', () => {
    expect(contactLine(basics)).toBe(
      'Sydney, Australia | 0400 000 000 | test@example.com | linkedin.com/in/test',
    );
  });

  it('skips missing fields', () => {
    expect(contactLine({ email: 'only@example.com' })).toBe('only@example.com');
  });
});

describe('itemHeadline', () => {
  it('formats title, org and dates with an en dash', () => {
    const headline = itemHeadline(item);
    expect(headline).toBe('Developer, Bank Co (Jan 2020 – Present)');
    expect(headline).toContain('\u2013');
    expect(headline).not.toContain('\u2014');
  });

  it('falls back to whichever parts exist', () => {
    expect(itemHeadline({ id: 'x', title: 'Analyst', bullets: [] })).toBe('Analyst');
    expect(itemHeadline({ id: 'x', org: 'Solo Co', bullets: [] })).toBe('Solo Co');
    expect(itemHeadline({ id: 'x', start: '2021', bullets: [] })).toBe('2021');
    expect(itemHeadline({ id: 'x', bullets: [] })).toBe('');
  });
});

describe('buildDocx', () => {
  it('produces a non-trivial zip (docx) buffer', async () => {
    const buffer = await buildDocx(doc);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
