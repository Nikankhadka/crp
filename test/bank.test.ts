import { describe, expect, it } from 'vitest';
import { parseBank } from '../src/core/bank';

// A small fixture shaped like seed/me/resume.yaml, so tests stay portable.
const fixture = `
basics:
  name: Test Person
  location: Sydney, Australia
  pronouns: they/them
summaries:
  - id: summary-01
    track: tech
    tags: [tech]
    text: Full-stack developer.
sections:
  - type: experience
    items:
      - id: exp-one
        track: tech
        tags: [tech]
        title: Developer
        org: Example Co
        start: Jan 2020
        end: Present
        tech: [TypeScript]
        bullets:
          - id: exp-one-01
            tags: [impact]
            text: Built a platform used by 20 clients.
  - type: projects
    items:
      - id: proj-one
        tags: [tech]
        name: Example Project
        start: Nov 2022
        end: "2026"
        context: A short context line.
        bullets:
          - id: proj-one-01
            tags: [full-stack]
            text: Built an app.
  - type: education
    items:
      - id: edu-one
        track: tech
        institution: Example University
        credential: BSc CS
        coursework: Databases and web development.
        start: "2021"
        end: "2023"
  - type: certifications
    items:
      - id: cert-one
        track: care
        name: First Aid
        bullets:
          - id: cert-one-01
            text: Completed a first aid course.
  - type: awards
    items:
      - id: award-one
        tags: [tech]
        title: A prize
        text: Won a prize.
skills:
  - id: skill-tech
    tags: [tech]
    category: Programming
    items: [TypeScript, Python]
  - id: skill-care
    tags: [care]
    text: Teamwork
`;

function section(bank: ReturnType<typeof parseBank>, type: string) {
  return bank.sections.find((entry) => entry.type === type);
}

describe('parseBank', () => {
  it('accepts the generic seed shape', () => {
    const bank = parseBank(fixture);
    expect(bank.basics.name).toBe('Test Person');
    expect(bank.summaries[0]?.id).toBe('summary-01');
    expect(section(bank, 'experience')?.items[0]?.bullets?.[0]?.id).toBe('exp-one-01');
    expect(section(bank, 'projects')?.items[0]?.bullets?.[0]?.id).toBe('proj-one-01');
    expect(section(bank, 'education')?.items[0]?.id).toBe('edu-one');
    expect(section(bank, 'certifications')?.items[0]?.bullets?.[0]?.id).toBe('cert-one-01');
    expect(section(bank, 'awards')?.items[0]?.text).toBe('Won a prize.');
    expect(bank.skills[0]?.items).toEqual(['TypeScript', 'Python']);
    expect(bank.skills[1]?.text).toBe('Teamwork');
  });

  it('keeps extra fields on basics, items, summaries and skills', () => {
    const bank = parseBank(fixture);
    expect((bank.basics as Record<string, unknown>).pronouns).toBe('they/them');
    expect(
      (section(bank, 'education')?.items[0] as Record<string, unknown> | undefined)?.coursework,
    ).toBe('Databases and web development.');
  });

  it('rejects a misplaced top-level key instead of stripping it', () => {
    expect(() => parseBank(`${fixture}\nlicences: [Churchill]\n`)).toThrow();
  });

  it('rejects a section item missing its id', () => {
    const broken = fixture.replace('      - id: exp-one\n', '      - track: tech\n');
    expect(() => parseBank(broken)).toThrow();
  });

  it('rejects a bullet missing its id', () => {
    const broken = fixture.replace('          - id: exp-one-01\n', '          - tags: [impact]\n');
    expect(() => parseBank(broken)).toThrow();
  });

  it('rejects a summary missing text', () => {
    const broken = fixture.replace('    text: Full-stack developer.\n', '');
    expect(() => parseBank(broken)).toThrow();
  });

  it('rejects malformed YAML', () => {
    expect(() => parseBank('basics: [unclosed')).toThrow();
  });
});
