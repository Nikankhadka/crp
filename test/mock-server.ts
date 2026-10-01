import { createServer, type IncomingHttpHeaders } from 'node:http';

export interface MockResult {
  status?: number;
  content?: string;
  delayMs?: number;
}

export type MockHandler = (
  body: unknown,
  callIndex: number,
  headers: IncomingHttpHeaders,
) => MockResult;

export interface MockServer {
  url: string;
  close: () => Promise<void>;
}

/** Minimal OpenAI-compatible chat completions server for tests. No network. */
export async function createMockServer(handler: MockHandler): Promise<MockServer> {
  let calls = 0;

  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      let body: unknown = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
      const result = handler(body, calls++, req.headers);

      const respond = (): void => {
        if (result.status !== undefined && result.status >= 400) {
          res.statusCode = result.status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: { message: 'mock error', type: 'mock' } }));
          return;
        }
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            id: 'chatcmpl-mock',
            object: 'chat.completion',
            created: 0,
            model: 'mock',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: result.content ?? '' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
          }),
        );
      };

      if (result.delayMs && result.delayMs > 0) setTimeout(respond, result.delayMs);
      else respond();
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}/v1`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

export const VALID_SCORE = {
  score: 80,
  seniorityFit: 'match' as const,
  mustHavesMet: ['JavaScript'],
  mustHavesMissing: ['Docker'],
  keywordsToMirror: ['REST APIs', 'testing'],
  redFlags: [],
  oneLineWhy: 'Strong overlap with the stated requirements.',
};
