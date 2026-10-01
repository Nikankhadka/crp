import { isIP } from 'node:net';
import { z } from 'zod';
import { MAX_JD_BYTES } from '../core/limits';
import { truncateToBytes } from '../core/truncate';

// Job discovery: Adzuna finds listings, Firecrawl reads one posting. Both are optional and keyed by
// env vars. The Adzuna app id and key travel in the request URL, so no error path may carry the URL.

export const COUNTRIES = ['gb', 'us', 'au', 'at', 'br', 'ca', 'de', 'es', 'fr', 'in', 'it', 'mx', 'nl', 'nz', 'pl', 'sg', 'za'] as const;
export type Country = (typeof COUNTRIES)[number];

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  snippet: string;
  url: string;
  postedAt?: string;
  salaryMin?: number;
  salaryMax?: number;
}

export interface DiscoveryDeps {
  fetch?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}

/**
 * A failure with a message that is safe to show the user. `status` is the HTTP status to answer
 * with: 400 bad input, 503 not configured, 502 the upstream failed.
 */
export class DiscoveryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const isSet = (value: string | undefined): boolean => {
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed !== '' && trimmed !== 'replace-me';
};

export function discoveryConfig(env: NodeJS.ProcessEnv = process.env): { adzuna: boolean; firecrawl: boolean } {
  return {
    adzuna: isSet(env.ADZUNA_APP_ID) && isSet(env.ADZUNA_APP_KEY),
    firecrawl: isSet(env.FIRECRAWL_API_KEY),
  };
}

export const isCountry = (value: string): value is Country => (COUNTRIES as readonly string[]).includes(value);

export function defaultCountry(env: NodeJS.ProcessEnv = process.env): Country {
  const value = env.ADZUNA_COUNTRY?.trim().toLowerCase() ?? '';
  return isCountry(value) ? value : 'us';
}

/**
 * One upstream call. Any failure (network, timeout, non-2xx, bad JSON, wrong shape) becomes a
 * DiscoveryError with a fixed message: the upstream body and the error text (which can quote the
 * URL, and with it the key) are never passed on. Only a status or error name is logged.
 */
async function request<T>(call: {
  service: string;
  failure: string;
  fetch: typeof fetch;
  url: string;
  init: RequestInit;
  timeoutMs: number;
  schema: z.ZodType<T>;
}): Promise<T> {
  let reason: string;
  try {
    const response = await call.fetch(call.url, { ...call.init, signal: AbortSignal.timeout(call.timeoutMs) });
    if (response.ok) {
      const parsed = call.schema.safeParse(await response.json());
      if (parsed.success) return parsed.data;
      reason = 'unexpected response shape';
    } else {
      reason = `HTTP ${response.status}`;
    }
  } catch (err) {
    reason = err instanceof Error ? err.name : 'unknown error';
  }
  console.error(`${call.service} request failed: ${reason}`);
  throw new DiscoveryError(call.failure, 502);
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

/** Adzuna wraps matched keywords in <strong>; drop all tags and decode the few common entities. */
const plain = (html: string): string =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, name: string) => ENTITIES[name] ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const isHttpUrl = (value: string): boolean => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const AdzunaResponse = z.object({
  count: z.number(),
  results: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      title: z.string(),
      company: z.object({ display_name: z.string().nullish() }).nullish(),
      location: z.object({ display_name: z.string().nullish() }).nullish(),
      description: z.string().nullish(),
      redirect_url: z.string(),
      created: z.string().nullish(),
      salary_min: z.number().nullish(),
      salary_max: z.number().nullish(),
    }),
  ),
});

const RESULTS_PER_PAGE = 20;
const MAX_PAGE = 50;
const MAX_QUERY_CHARS = 200;

export interface SearchInput {
  what?: string;
  where?: string;
  country: string;
  page: number;
}

/** Search Adzuna. Needs ADZUNA_APP_ID and ADZUNA_APP_KEY. */
export async function searchJobs(
  input: SearchInput,
  deps: DiscoveryDeps = {},
): Promise<{ listings: JobListing[]; total: number }> {
  const env = deps.env ?? process.env;
  if (!discoveryConfig(env).adzuna) throw new DiscoveryError('job search is not configured', 503);

  const what = (input.what ?? '').trim();
  const where = (input.where ?? '').trim();
  if (what === '' && where === '') throw new DiscoveryError('enter a keyword or a place', 400);
  if (what.length > MAX_QUERY_CHARS || where.length > MAX_QUERY_CHARS) {
    throw new DiscoveryError(`keyword and place must be at most ${MAX_QUERY_CHARS} characters`, 400);
  }
  // The country becomes part of the URL path, so it must come from the list.
  if (!isCountry(input.country)) throw new DiscoveryError('unsupported country', 400);
  if (!Number.isInteger(input.page) || input.page < 1 || input.page > MAX_PAGE) {
    throw new DiscoveryError(`page must be a whole number from 1 to ${MAX_PAGE}`, 400);
  }

  const url = new URL(`/v1/api/jobs/${input.country}/search/${input.page}`, env.ADZUNA_BASE_URL ?? 'https://api.adzuna.com');
  const params = new URLSearchParams({
    app_id: env.ADZUNA_APP_ID!.trim(),
    app_key: env.ADZUNA_APP_KEY!.trim(),
    results_per_page: String(RESULTS_PER_PAGE),
  });
  if (what !== '') params.set('what', what);
  if (where !== '') params.set('where', where);
  params.set('content-type', 'application/json');
  url.search = params.toString();

  const body = await request({
    service: 'adzuna',
    failure: 'job search failed',
    fetch: deps.fetch ?? fetch,
    url: url.toString(),
    init: {},
    timeoutMs: 15_000,
    schema: AdzunaResponse,
  });
  return {
    total: body.count,
    listings: body.results
      .filter((result) => isHttpUrl(result.redirect_url))
      .map((result) => ({
        id: String(result.id),
        title: plain(result.title),
        company: plain(result.company?.display_name ?? ''),
        location: plain(result.location?.display_name ?? ''),
        snippet: plain(result.description ?? ''),
        url: result.redirect_url,
        ...(result.created ? { postedAt: result.created } : {}),
        ...(result.salary_min ? { salaryMin: result.salary_min } : {}),
        ...(result.salary_max ? { salaryMax: result.salary_max } : {}),
      })),
  };
}

const MAX_URL_CHARS = 2048;

/**
 * Firecrawl fetches the page from its own servers, so this is only cheap defense in depth against
 * pointing it at local or private hosts: http(s) only, no credentials, no localhost or IP literal.
 */
function parsePostingUrl(raw: string): URL {
  const invalid = new DiscoveryError('enter a valid http or https link', 400);
  if (raw.length > MAX_URL_CHARS) throw invalid;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw invalid;
  }
  const host = url.hostname.replace(/\.$/, '').toLowerCase();
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username !== '' ||
    url.password !== '' ||
    host === '' ||
    host.startsWith('[') ||
    isIP(host) !== 0 ||
    host === 'localhost' ||
    ['.localhost', '.local', '.internal'].some((suffix) => host.endsWith(suffix))
  ) {
    throw invalid;
  }
  return url;
}

const FirecrawlResponse = z.object({
  success: z.literal(true),
  data: z.object({
    markdown: z.string().nullish(),
    metadata: z.object({ title: z.union([z.string(), z.array(z.string())]).nullish() }).nullish(),
  }),
});

/** Read one posting as markdown with Firecrawl. Needs FIRECRAWL_API_KEY. */
export async function fetchPosting(
  rawUrl: string,
  deps: DiscoveryDeps = {},
): Promise<{ title: string; text: string }> {
  const env = deps.env ?? process.env;
  if (!discoveryConfig(env).firecrawl) throw new DiscoveryError('importing from a link is not configured', 503);
  const url = parsePostingUrl(rawUrl.trim());

  const body = await request({
    service: 'firecrawl',
    failure: 'page import failed',
    fetch: deps.fetch ?? fetch,
    url: new URL('/v2/scrape', env.FIRECRAWL_BASE_URL ?? 'https://api.firecrawl.dev').toString(),
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.FIRECRAWL_API_KEY!.trim()}` },
      body: JSON.stringify({ url: url.toString(), formats: ['markdown'], onlyMainContent: true, timeout: 45_000 }),
    },
    timeoutMs: 60_000,
    schema: FirecrawlResponse,
  });

  const markdown = body.data.markdown?.trim() ?? '';
  if (markdown === '') throw new DiscoveryError('could not read that page', 502);
  const title = body.data.metadata?.title;
  return {
    title: (Array.isArray(title) ? (title[0] ?? '') : (title ?? '')).trim().slice(0, 200),
    text: truncateToBytes(markdown, MAX_JD_BYTES),
  };
}
