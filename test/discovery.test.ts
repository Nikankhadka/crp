import { describe, expect, it } from 'vitest';
import {
  defaultCountry,
  discoveryConfig,
  DiscoveryError,
  fetchPosting,
  searchJobs,
} from '../src/server/discovery';

const ADZUNA_ENV = {
  NODE_ENV: 'test' as const,
  ADZUNA_APP_ID: 'app-id',
  ADZUNA_APP_KEY: 'app-key',
};

const firecrawlEnv = (key = 'fc-key') => ({ NODE_ENV: 'test' as const, FIRECRAWL_API_KEY: key });

const testEnv = (values: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: 'test',
  ...values,
});

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockFetch(response: Response | (() => Response), calls: FetchCall[] = []): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return typeof response === 'function' ? response() : response;
  }) as typeof fetch;
}

const ADZUNA_PAGE = {
  count: 42,
  results: [
    {
      id: 123,
      title: 'Senior <strong>Developer</strong>',
      company: { display_name: 'Acme &amp; Co' },
      location: { display_name: 'Sydney' },
      description: 'Build <strong>things</strong> &amp; ship them.',
      redirect_url: 'https://example.com/jobs/123',
      created: '2026-09-30T00:00:00Z',
      salary_min: 100000,
      salary_max: 130000,
    },
    {
      id: 'bad-url',
      title: 'Ignored',
      company: null,
      location: null,
      description: null,
      redirect_url: 'javascript:alert(1)',
    },
  ],
};

async function expectDiscoveryError(promise: Promise<unknown>, status: number, message: string): Promise<void> {
  const error = await promise.then(
    () => null,
    (err: unknown) => err,
  );
  expect(error).toBeInstanceOf(DiscoveryError);
  expect((error as DiscoveryError).status).toBe(status);
  expect((error as DiscoveryError).message).toBe(message);
}

describe('discoveryConfig', () => {
  it('is off when keys are unset or left as placeholders', () => {
    expect(discoveryConfig(testEnv())).toEqual({ adzuna: false, firecrawl: false });
    expect(discoveryConfig(testEnv({ ADZUNA_APP_ID: 'replace-me', ADZUNA_APP_KEY: 'x' })).adzuna).toBe(false);
    expect(discoveryConfig(testEnv({ ADZUNA_APP_ID: 'x', ADZUNA_APP_KEY: ' ' })).adzuna).toBe(false);
    expect(discoveryConfig(testEnv({ FIRECRAWL_API_KEY: 'replace-me' })).firecrawl).toBe(false);
  });

  it('is on when both keys are set', () => {
    expect(discoveryConfig(ADZUNA_ENV).adzuna).toBe(true);
    expect(discoveryConfig(firecrawlEnv()).firecrawl).toBe(true);
  });
});

describe('defaultCountry', () => {
  it('defaults to us and accepts a known country', () => {
    expect(defaultCountry(testEnv())).toBe('us');
    expect(defaultCountry(testEnv({ ADZUNA_COUNTRY: 'AU' }))).toBe('au');
    expect(defaultCountry(testEnv({ ADZUNA_COUNTRY: 'nope' }))).toBe('us');
  });
});

describe('searchJobs', () => {
  it('rejects when Adzuna is not configured', async () => {
    await expectDiscoveryError(
      searchJobs({ what: 'dev', country: 'us', page: 1 }, { env: testEnv() }),
      503,
      'job search is not configured',
    );
  });

  it('validates the query before calling upstream', async () => {
    const deps = { env: ADZUNA_ENV, fetch: mockFetch(jsonResponse(ADZUNA_PAGE)) };
    await expectDiscoveryError(searchJobs({ what: '', where: '', country: 'us', page: 1 }, deps), 400, 'enter a keyword or a place');
    await expectDiscoveryError(searchJobs({ what: 'x'.repeat(201), country: 'us', page: 1 }, deps), 400, 'keyword and place must be at most 200 characters');
    await expectDiscoveryError(searchJobs({ what: 'dev', country: 'xx', page: 1 }, deps), 400, 'unsupported country');
    await expectDiscoveryError(searchJobs({ what: 'dev', country: 'us', page: 0 }, deps), 400, 'page must be a whole number from 1 to 50');
    await expectDiscoveryError(searchJobs({ what: 'dev', country: 'us', page: 51 }, deps), 400, 'page must be a whole number from 1 to 50');
  });

  it('builds the Adzuna URL, maps results and drops non-http links', async () => {
    const calls: FetchCall[] = [];
    const result = await searchJobs(
      { what: 'developer', where: 'Sydney', country: 'au', page: 2 },
      { env: ADZUNA_ENV, fetch: mockFetch(jsonResponse(ADZUNA_PAGE), calls) },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.origin).toBe('https://api.adzuna.com');
    expect(url.pathname).toBe('/v1/api/jobs/au/search/2');
    expect(url.searchParams.get('app_id')).toBe('app-id');
    expect(url.searchParams.get('app_key')).toBe('app-key');
    expect(url.searchParams.get('what')).toBe('developer');
    expect(url.searchParams.get('where')).toBe('Sydney');
    expect(url.searchParams.get('results_per_page')).toBe('20');

    expect(result.total).toBe(42);
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toEqual({
      id: '123',
      title: 'Senior Developer',
      company: 'Acme & Co',
      location: 'Sydney',
      snippet: 'Build things & ship them.',
      url: 'https://example.com/jobs/123',
      postedAt: '2026-09-30T00:00:00Z',
      salaryMin: 100000,
      salaryMax: 130000,
    });
  });

  it('honours an Adzuna base URL override', async () => {
    const calls: FetchCall[] = [];
    await searchJobs(
      { what: 'dev', country: 'us', page: 1 },
      { env: { ...ADZUNA_ENV, ADZUNA_BASE_URL: 'https://adzuna.test' }, fetch: mockFetch(jsonResponse(ADZUNA_PAGE), calls) },
    );
    expect(new URL(calls[0].url).origin).toBe('https://adzuna.test');
  });

  it('turns upstream failures into a fixed 502 without echoing the key', async () => {
    const secretUrl = 'https://api.adzuna.com?app_key=super-secret';
    await expectDiscoveryError(
      searchJobs({ what: 'dev', country: 'us', page: 1 }, { env: ADZUNA_ENV, fetch: mockFetch(() => new Response('oops', { status: 500 })) }),
      502,
      'job search failed',
    );
    const error = await searchJobs(
      { what: 'dev', country: 'us', page: 1 },
      {
        env: ADZUNA_ENV,
        fetch: (async () => {
          throw new Error(`request to ${secretUrl} failed`);
        }) as typeof fetch,
      },
    ).then(
      () => null,
      (err: unknown) => err as Error,
    );
    expect(error?.message).toBe('job search failed');
    expect(error?.message).not.toContain('super-secret');
  });

  it('rejects an unexpected response shape', async () => {
    await expectDiscoveryError(
      searchJobs({ what: 'dev', country: 'us', page: 1 }, { env: ADZUNA_ENV, fetch: mockFetch(jsonResponse({ count: 'many' })) }),
      502,
      'job search failed',
    );
  });
});

describe('fetchPosting', () => {
  it('rejects when Firecrawl is not configured', async () => {
    await expectDiscoveryError(
      fetchPosting('https://example.com/job', { env: testEnv() }),
      503,
      'importing from a link is not configured',
    );
  });

  it('rejects unsafe or malformed URLs', async () => {
    const deps = { env: firecrawlEnv() };
    for (const url of [
      'not a url',
      'ftp://example.com/job',
      'https://user:pass@example.com/job',
      'http://localhost:3000/job',
      'http://127.0.0.1/job',
      'http://[::1]/job',
      'https://box.local/job',
      'https://api.internal/job',
      `https://example.com/${'x'.repeat(2100)}`,
    ]) {
      await expectDiscoveryError(fetchPosting(url, deps), 400, 'enter a valid http or https link');
    }
  });

  it('scrapes with Firecrawl and normalises the title', async () => {
    const calls: FetchCall[] = [];
    const result = await fetchPosting('https://example.com/job', {
      env: firecrawlEnv(),
      fetch: mockFetch(
        jsonResponse({ success: true, data: { markdown: '# Job\n\nBody.', metadata: { title: ['Role at Acme', 'ignored'] } } }),
        calls,
      ),
    });

    expect(new URL(calls[0].url).origin).toBe('https://api.firecrawl.dev');
    expect(new URL(calls[0].url).pathname).toBe('/v2/scrape');
    expect(calls[0].init?.method).toBe('POST');
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer fc-key');
    const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
    expect(body.url).toBe('https://example.com/job');
    expect(body.onlyMainContent).toBe(true);

    expect(result.title).toBe('Role at Acme');
    expect(result.text).toBe('# Job\n\nBody.');
  });

  it('truncates long postings to the JD limit', async () => {
    const result = await fetchPosting('https://example.com/job', {
      env: firecrawlEnv(),
      fetch: mockFetch(jsonResponse({ success: true, data: { markdown: 'word '.repeat(10_000), metadata: { title: 'Big role' } } })),
    });
    expect(result.text.endsWith('[truncated]')).toBe(true);
    expect(Buffer.byteLength(result.text, 'utf8')).toBeLessThanOrEqual(20 * 1024);
  });

  it('fails when the page has no readable text', async () => {
    await expectDiscoveryError(
      fetchPosting('https://example.com/job', {
        env: firecrawlEnv(),
        fetch: mockFetch(jsonResponse({ success: true, data: { markdown: '  ', metadata: {} } })),
      }),
      502,
      'could not read that page',
    );
  });

  it('turns an upstream failure into a fixed 502', async () => {
    await expectDiscoveryError(
      fetchPosting('https://example.com/job', {
        env: firecrawlEnv(),
        fetch: mockFetch(() => new Response('nope', { status: 500 })),
      }),
      502,
      'page import failed',
    );
  });
});
