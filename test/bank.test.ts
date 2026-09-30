import { describe, expect, it } from 'vitest';
import { parseBank } from '../src/core/bank.js';

// A small fixture shaped like seed/me/resume.yaml, so tests stay portable.
const fixture = `
basics:
  name: Test Person
  location: Sydney, Australia
summaries:
  - id: summary-01
    track: tech
    tags: [tech]
    text: Full-stack developer.
experience:
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
projects:
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
education:
  - id: edu-one
    track: tech
    institution: Example University
    credential: BSc CS
    start: "2021"
    end: "2023"
certifications:
  - id: cert-one
    track: care
    name: First Aid
skills:
  - id: skill-tech
    tags: [tech]
    category: Programming
    items: [TypeScript, Python]
  - id: skill-care
    tags: [care]
    text: Teamwork
awards:
  - id: award-one
    tags: [tech]
    title: A prize
    text: Won a prize.
`;

describe('parseBank', () => {
  it('accepts the real seed shape', () => {
    const bank = parseBank(fixture);
    expect(bank.basics.name).toBe('Test Person');
    expect(bank.summaries[0]?.id).toBe('summary-01');
    expect(bank.experience[0]?.bullets?.[0]?.id).toBe('exp-one-01');
    expect(bank.projects[0]?.bullets?.[0]?.id).toBe('proj-one-01');
    expect(bank.education[0]?.id).toBe('edu-one');
    expect(bank.certifications[0]?.id).toBe('cert-one');
    expect(bank.skills[0]?.items).toEqual(['TypeScript', 'Python']);
    expect(bank.skills[1]?.text).toBe('Teamwork');
    expect(bank.awards[0]?.id).toBe('award-one');
  });

  it('rejects an experience item missing its id', () => {
    const broken = fixture.replace('  - id: exp-one\n', '  - track: tech\n');
    expect(() => parseBank(broken)).toThrow();
  });

  it('rejects a bullet missing its id', () => {
    const broken = fixture.replace('      - id: exp-one-01\n', '      - tags: [impact]\n');
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
