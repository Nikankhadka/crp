import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
} from 'openai';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tracePath = join(repoRoot, 'traces', 'llm-calls.jsonl');

// Node 22 built-in. .env is optional; real environment variables take precedence.
try {
  process.loadEnvFile('.env');
} catch {
  // no .env file, use the ambient environment
}

interface ProviderConfig {
  provider: 'primary' | 'fallback';
  baseURL: string;
  apiKey: string;
  model: string;
}

function timeoutMs(): number {
  const raw = Number(process.env.LLM_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 90_000;
}

function primaryConfig(): ProviderConfig | null {
  const { LLM_BASE_URL, LLM_API_KEY, LLM_MODEL } = process.env;
  if (!LLM_BASE_URL || !LLM_API_KEY || !LLM_MODEL) return null;
  return { provider: 'primary', baseURL: LLM_BASE_URL, apiKey: LLM_API_KEY, model: LLM_MODEL };
}

function fallbackConfig(): ProviderConfig | null {
  const { LLM_FALLBACK_BASE_URL, LLM_FALLBACK_API_KEY, LLM_FALLBACK_MODEL } = process.env;
  if (!LLM_FALLBACK_BASE_URL || !LLM_FALLBACK_API_KEY || !LLM_FALLBACK_MODEL) return null;
  return {
    provider: 'fallback',
    baseURL: LLM_FALLBACK_BASE_URL,
    apiKey: LLM_FALLBACK_API_KEY,
    model: LLM_FALLBACK_MODEL,
  };
}

interface TraceRecord {
  ts: string;
  task: string;
  provider: 'primary' | 'fallback';
  model: string;
  ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  ok: boolean;
  error?: string;
}

function writeTrace(record: TraceRecord): void {
  mkdirSync(dirname(tracePath), { recursive: true });
  appendFileSync(tracePath, `${JSON.stringify(record)}\n`);
}

function isRetryable(err: unknown): boolean {
  if (err instanceof APIConnectionTimeoutError) return true;
  if (err instanceof APIConnectionError) return true;
  if (err instanceof APIError) {
    return err.status === 429 || (typeof err.status === 'number' && err.status >= 500);
  }
  return false;
}

function parseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(cleaned);
}

async function attempt(
  task: string,
  cfg: ProviderConfig,
  system: string,
  user: string,
): Promise<string> {
  const started = Date.now();
  try {
    const client = new OpenAI({
      baseURL: cfg.baseURL,
      apiKey: cfg.apiKey,
      timeout: timeoutMs(),
      maxRetries: 0,
    });
    const res = await client.chat.completions.create({
      model: cfg.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    });
    const text = res.choices[0]?.message?.content ?? '';
    writeTrace({
      ts: new Date().toISOString(),
      task,
      provider: cfg.provider,
      model: cfg.model,
      ms: Date.now() - started,
      prompt_tokens: res.usage?.prompt_tokens ?? 0,
      completion_tokens: res.usage?.completion_tokens ?? 0,
      ok: true,
    });
    return text;
  } catch (err) {
    writeTrace({
      ts: new Date().toISOString(),
      task,
      provider: cfg.provider,
      model: cfg.model,
      ms: Date.now() - started,
      prompt_tokens: 0,
      completion_tokens: 0,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Call the configured OpenAI-compatible provider and return the parsed JSON payload.
 * Falls back once to the fallback provider on HTTP 429, 5xx, connection error or timeout.
 */
export async function completeJson(task: string, system: string, user: string): Promise<unknown> {
  const primary = primaryConfig();
  if (!primary) throw new Error('Missing LLM_BASE_URL, LLM_API_KEY or LLM_MODEL');

  try {
    return parseJson(await attempt(task, primary, system, user));
  } catch (err) {
    if (!isRetryable(err)) throw err;
    const fallback = fallbackConfig();
    if (!fallback) throw err;
    return parseJson(await attempt(task, fallback, system, user));
  }
}
