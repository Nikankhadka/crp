import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolvePaths } from '../paths';

export interface PromptLayers {
  task: string;
  personal: string;
  bank: string;
  job: string;
  /** Background reference only; never a source of facts. */
  docs?: string;
  research?: string;
}

/**
 * Pure string assembly. System prompt is the two base files concatenated; the user message
 * is the personal/bank/docs/research/job layers, with docs and research omitted when absent.
 */
export function buildPrompt(layers: PromptLayers): { system: string; user: string } {
  const { promptsDir } = resolvePaths();
  const system =
    readFileSync(join(promptsDir, 'system.md'), 'utf8') +
    readFileSync(join(promptsDir, `${layers.task}.md`), 'utf8');

  const parts = [
    `<personal>\n${layers.personal}\n</personal>`,
    `<bank>\n${layers.bank}\n</bank>`,
  ];
  if (layers.docs !== undefined) {
    parts.push(`<docs>\n${layers.docs}\n</docs>`);
  }
  if (layers.research !== undefined) {
    parts.push(`<research>\n${layers.research}\n</research>`);
  }
  parts.push(`<job>\n${layers.job}\n</job>`);

  return { system, user: parts.join('\n') };
}
