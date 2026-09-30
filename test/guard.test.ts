import { describe, expect, it } from 'vitest';
import { parseBank, type Bank } from '../src/core/bank.js';
import { guard } from '../src/core/guard.js';
import type { Tailored } from '../src/core/schemas.js';

const bank: Bank = parseBank(`
summaries:
  - id: summary-01
    text: Full-stack developer with 20 clients and 70% faster delivery.
sections:
  - type: experience
    items:
      - id: exp-one
        title: Developer
        org: Example Co
        bullets:
          - id: exp-one-01
            text: Built a platform used by about 20 clients and cut effort by 70%.
          - id: exp-one-02
            text: Implemented REST APIs with Node.js.
      - id: exp-empty
        title: Empty Role
        org: Nowhere
  - type: projects
    items:
      - id: proj-one
        name: Example Project
        bullets:
          - id: proj-one-01
            text: Optimised performance, bundle size down 20%+.
skills:
  - id: skill-tech
    category: Programming
    items: [TypeScript, Node.js, React]
`);

function tailored(overrides: Partial<Tailored> = {}): Tailored {
  return {
    summaryId: 'summary-01',
    summaryRewrite: 'Full-stack developer serving 20 clients.',
    sections: [
      {
        type: 'experience',
        items: [
          {
            itemId: 'exp-one',
            bullets: [
              { sourceId: 'exp-one-01', text: 'Built a platform used by about 20 clients.' },
            ],
          },
        ],
      },
    ],
    skillsOrder: ['TypeScript'],
    gaps: [],
    ...overrides,
  };
}

describe('guard', () => {
  it('passes a valid tailored result', () => {
    expect(guard(tailored(), bank)).toEqual([]);
  });

  it('allows items with no bullets', () => {
    const result = tailored({
      sections: [{ type: 'experience', items: [{ itemId: 'exp-empty', bullets: [] }] }],
    });
    expect(guard(result, bank)).toEqual([]);
  });

  it('flags an unknown sourceId', () => {
    const result = tailored({
      sections: [
        {
          type: 'experience',
          items: [{ itemId: 'exp-one', bullets: [{ sourceId: 'nope', text: 'x' }] }],
        },
      ],
    });
    const violations = guard(result, bank);
    expect(violations.some((v) => v.rule === 'sourceId')).toBe(true);
  });

  it('flags an unknown itemId', () => {
    const result = tailored({
      sections: [{ type: 'experience', items: [{ itemId: 'nope', bullets: [] }] }],
    });
    const violations = guard(result, bank);
    expect(violations.some((v) => v.rule === 'itemId')).toBe(true);
  });

  it('flags an unknown summaryId', () => {
    const violations = guard(tailored({ summaryId: 'nope' }), bank);
    expect(violations.some((v) => v.rule === 'summaryId')).toBe(true);
  });

  it('flags an invented number', () => {
    const result = tailored({
      sections: [
        {
          type: 'experience',
          items: [
            {
              itemId: 'exp-one',
              bullets: [
                {
                  sourceId: 'exp-one-01',
                  text: 'Built a platform used by about 20 clients and cut effort by 85%.',
                },
              ],
            },
          ],
        },
      ],
    });
    const violations = guard(result, bank);
    expect(violations.some((v) => v.rule === 'number')).toBe(true);
  });

  it('accepts a number with a suffix when it is in the source', () => {
    const result = tailored({
      summaryRewrite: 'Full-stack developer.',
      sections: [
        {
          type: 'experience',
          items: [
            {
              itemId: 'proj-one',
              bullets: [
                { sourceId: 'proj-one-01', text: 'Optimised performance, bundle size down 20%+.' },
              ],
            },
          ],
        },
      ],
    });
    expect(guard(result, bank)).toEqual([]);
  });

  it('flags an invented number in the summary rewrite', () => {
    const violations = guard(tailored({ summaryRewrite: 'Served 99 clients.' }), bank);
    expect(violations.some((v) => v.rule === 'number')).toBe(true);
  });

  it('flags a rewrite that shares less than half the source words', () => {
    const result = tailored({
      sections: [
        {
          type: 'experience',
          items: [
            {
              itemId: 'exp-one',
              bullets: [
                { sourceId: 'exp-one-01', text: 'Delivered many different things.' },
              ],
            },
          ],
        },
      ],
    });
    const violations = guard(result, bank);
    expect(violations.some((v) => v.rule === 'reword')).toBe(true);
  });

  it('flags an unknown skill', () => {
    const violations = guard(tailored({ skillsOrder: ['TypeScript', 'Rust'] }), bank);
    expect(violations.some((v) => v.rule === 'skill')).toBe(true);
  });

  it('flags an unsupported vocabulary term when vocabulary is provided', () => {
    const result = tailored({
      sections: [
        {
          type: 'experience',
          items: [
            {
              itemId: 'exp-one',
              bullets: [
                {
                  sourceId: 'exp-one-01',
                  text: 'Built a platform used by about 20 clients with new Kubernetes tooling.',
                },
              ],
            },
          ],
        },
      ],
    });
    const withVocab = guard(result, bank, { vocabulary: ['Kubernetes'] });
    expect(withVocab.some((v) => v.rule === 'vocabulary')).toBe(true);
    expect(guard(result, bank)).toEqual([]);
  });

  it('allows a vocabulary term that appears in the bank skills', () => {
    const result = tailored({
      sections: [
        {
          type: 'experience',
          items: [
            {
              itemId: 'exp-one',
              bullets: [
                { sourceId: 'exp-one-02', text: 'Implemented REST APIs with Node.js.' },
              ],
            },
          ],
        },
      ],
    });
    expect(guard(result, bank, { vocabulary: ['Node.js'] })).toEqual([]);
  });
});
