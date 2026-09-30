import type { Bank } from './bank.js';
import type { Tailored } from './schemas.js';

export type GuardRule =
  | 'itemId'
  | 'sourceId'
  | 'summaryId'
  | 'number'
  | 'reword'
  | 'skill'
  | 'vocabulary'
  | 'neverMention';

export interface Violation {
  rule: GuardRule;
  /** The offending id or text fragment, for the retry prompt. */
  ref: string;
  message: string;
}

export interface GuardOptions {
  /** Research brief terms (next slice). Any term a rewrite uses must be in its source or the bank skills. */
  vocabulary?: string[];
  /** The personal layer's never-mention register. Any listed term in a rewrite must be in its source or the bank skills. */
  neverMention?: string[];
}

// Word-overlap rule (rewording check): lowercase the text, replace every non-alphanumeric
// character with a space, split on whitespace, and drop tokens of length <= 2 (very short
// stopwords). Two texts must share at least half of the source's tokens, floor-rounded, for
// the rewrite to count as "light rewording" rather than a new claim. The threshold counts
// the *source* token set, so extra words added by the rewrite never help it pass.
const STOPWORD_LENGTH = 2;

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((token) => token.length > STOPWORD_LENGTH);
  return new Set(tokens);
}

// Extracts numbers from text, keeping decimals, percentages and suffixes (20%+, 20+) but
// normalising the suffix away so "20+" and "20" compare equal. Percent and suffix markers
// are not separate numbers.
const NUMBER_RE = /\d+(?:\.\d+)?/g;

function numbers(text: string): Set<string> {
  return new Set(text.match(NUMBER_RE) ?? []);
}

function overlapRatio(rewrite: string, source: string): number {
  const sourceTokens = tokenize(source);
  if (sourceTokens.size === 0) return 1;
  const rewriteTokens = tokenize(rewrite);
  let shared = 0;
  for (const token of sourceTokens) if (rewriteTokens.has(token)) shared += 1;
  return shared / sourceTokens.size;
}

/**
 * Pure anti-fabrication check. Validates a tailored result against the bank and returns every
 * violation found (empty array means clean). Org, title and dates are taken from the bank at
 * render time, so no rule is needed on them here: they reduce to the itemId/sourceId checks.
 */
export function guard(tailored: Tailored, bank: Bank, options: GuardOptions = {}): Violation[] {
  const violations: Violation[] = [];

  const summaryById = new Map(bank.summaries.map((summary) => [summary.id, summary]));
  const bulletById = new Map<string, string>();
  const itemIds = new Set<string>();
  for (const section of bank.sections) {
    for (const item of section.items) {
      itemIds.add(item.id);
      for (const bullet of item.bullets ?? []) bulletById.set(bullet.id, bullet.text);
    }
  }

  const skillTerms = new Set<string>();
  for (const group of bank.skills) {
    for (const item of group.items ?? []) skillTerms.add(item);
    if (group.text) for (const token of tokenize(group.text)) skillTerms.add(token);
  }

  // (b) summary id must exist.
  const sourceSummary = summaryById.get(tailored.summaryId);
  if (!sourceSummary) {
    violations.push({
      rule: 'summaryId',
      ref: tailored.summaryId,
      message: `summaryId "${tailored.summaryId}" is not in the bank`,
    });
  }

  // (c) numbers in the summary rewrite must come from the summary source text.
  if (sourceSummary) {
    const sourceNumbers = numbers(sourceSummary.text);
    for (const value of numbers(tailored.summaryRewrite)) {
      if (!sourceNumbers.has(value)) {
        violations.push({
          rule: 'number',
          ref: value,
          message: `summaryRewrite invents the number "${value}" not present in summary "${sourceSummary.id}"`,
        });
      }
    }
  }

  // (g) the summary rewrite must not introduce a never-mention term its source does not carry.
  if (sourceSummary) {
    for (const term of options.neverMention ?? []) {
      if (!containsTerm(tailored.summaryRewrite, term)) continue;
      if (containsTerm(sourceSummary.text, term) || skillTerms.has(term)) continue;
      violations.push({
        rule: 'neverMention',
        ref: term,
        message: `summaryRewrite uses "${term}", which is not in its source or the bank skills`,
      });
    }
  }

  for (const section of tailored.sections) {
    for (const item of section.items) {
      // (a) item id must exist.
      if (!itemIds.has(item.itemId)) {
        violations.push({
          rule: 'itemId',
          ref: item.itemId,
          message: `itemId "${item.itemId}" is not in the bank`,
        });
      }

      for (const bullet of item.bullets) {
        // (a) source id must exist.
        const sourceText = bulletById.get(bullet.sourceId);
        if (sourceText === undefined) {
          violations.push({
            rule: 'sourceId',
            ref: bullet.sourceId,
            message: `sourceId "${bullet.sourceId}" is not in the bank`,
          });
          continue;
        }

        // (c) numbers in the rewrite must come from the source bullet.
        const sourceNumbers = numbers(sourceText);
        for (const value of numbers(bullet.text)) {
          if (!sourceNumbers.has(value)) {
            violations.push({
              rule: 'number',
              ref: value,
              message: `bullet for "${bullet.sourceId}" invents the number "${value}"`,
            });
          }
        }

        // (e) the rewrite must share at least half of the source words.
        if (overlapRatio(bullet.text, sourceText) < 0.5) {
          violations.push({
            rule: 'reword',
            ref: bullet.sourceId,
            message: `bullet for "${bullet.sourceId}" shares less than half of the source words`,
          });
        }

        // (f) vocabulary terms must be supported by the source bullet or the bank skills.
        for (const term of options.vocabulary ?? []) {
          if (!containsTerm(bullet.text, term)) continue;
          if (containsTerm(sourceText, term) || skillTerms.has(term)) continue;
          violations.push({
            rule: 'vocabulary',
            ref: term,
            message: `bullet for "${bullet.sourceId}" uses "${term}", which is not in its source or the bank skills`,
          });
        }

        // (g) never-mention terms must be supported by the source bullet or the bank skills.
        for (const term of options.neverMention ?? []) {
          if (!containsTerm(bullet.text, term)) continue;
          if (containsTerm(sourceText, term) || skillTerms.has(term)) continue;
          violations.push({
            rule: 'neverMention',
            ref: term,
            message: `bullet for "${bullet.sourceId}" uses "${term}", which is not in its source or the bank skills`,
          });
        }
      }
    }
  }

  // (d) every ordered skill must exist in the bank skill groups.
  for (const skill of tailored.skillsOrder) {
    if (!skillTerms.has(skill)) {
      violations.push({
        rule: 'skill',
        ref: skill,
        message: `skill "${skill}" is not in the bank`,
      });
    }
  }

  return violations;
}

function containsTerm(text: string, term: string): boolean {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}
