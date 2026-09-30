import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'prompts', 'base');

export interface PromptLayers {
  task: string;
  personal: string;
  bank: string;
  job: string;
  research?: string;
}

/**
 * Pure string assembly. System prompt is the two base files concatenated; the user message
 * is the personal/bank/research/job layers, with research omitted when not supplied.
 */
export function buildPrompt(layers: PromptLayers): { system: string; user: string } {
  const system =
    readFileSync(join(baseDir, 'system.md'), 'utf8') +
    readFileSync(join(baseDir, `${layers.task}.md`), 'utf8');

  const parts = [
    `<personal>\n${layers.personal}\n</personal>`,
    `<bank>\n${layers.bank}\n</bank>`,
  ];
  if (layers.research !== undefined) {
    parts.push(`<research>\n${layers.research}\n</research>`);
  }
  parts.push(`<job>\n${layers.job}\n</job>`);

  return { system, user: parts.join('\n') };
}
