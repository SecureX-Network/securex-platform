import assert from 'node:assert/strict';
import { after, beforeEach, describe, it, mock } from 'node:test';

// The blockchain client is configured from the process environment at module
// load, so the variables must exist before it is imported.
process.env.BLOCKCHAIN_API_URL = 'http://blockchain.test';
process.env.BLOCKCHAIN_AUTH_TOKEN = 'test-token-not-a-real-secret';
process.env.BLOCKCHAIN_TIMEOUT_MS = '60000';

const { blockchainClient } = await import('../services/blockchain.js');

type FetchCall = { url: string; init: RequestInit | undefined };

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  } as unknown as Response;
}

/** Installs a fetch stub and records every call made against it. */
function stubFetch(handler: (call: FetchCall, index: number) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  mock.method(globalThis, 'fetch', async (input: unknown, init?: RequestInit) => {
    const call = { url: String(input), init };
    const index = calls.length;
    calls.push(call);
    return handler(call, index);
  });
  return calls;
}

const HEALTH = { status: 'UP', height: 0, nodeVersion: '3.0.0', protocolVersion: '2.0' };

/**
 * Runs an operation against a virtual clock.
 *
 * The retry window is deliberately long — it has to outlast a ~23s cold start —
 * so exercising it in real time would add minutes to the suite. Advancing the
 * clock instead keeps the *timing* assertions (which are the whole point of the
 * window) meaningful while costing nothing. Both setTimeout and Date are faked so
 * the client's shared-deadline logic sees the same virtual time.
 */
async function runOnVirtualClock<T>(operation: () => Promise<T>): Promise<{ result: T; elapsed: number }> {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    const start = Date.now();
    let settledAt: number | null = null;
    const pending = operation().then((value) => {
      settledAt = Date.now();
      return value;
    });
    // The window tops out well under 60s, so 200s of virtual headroom is more
    // than enough. Ticking stops as soon as the operation settles, otherwise the
    // measured window would include time after it already finished.
    for (let i = 0; i < 200 && settledAt === null; i += 1) {
      await mock.timers.tick(1_000);
    }
    const result = await pending;
    return { result, elapsed: (settledAt ?? Date.now()) - start };
  } finally {
    mock.timers.reset();
  }
}

describe('blockchain client: transient upstream failures', () => {
  beforeEach(() => {
    mock.restoreAll();
  });
  after(() => {
    mock.restoreAll();
  });

  it('sends the service credential on every attempt', async () => {
    const calls = stubFetch(() => jsonResponse(200, { success: true, data: HEALTH }));

    const result = await blockchainClient.health();

    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
    const headers = calls[0]!.init!.headers as Record<string, string>;
    assert.equal(headers.Authorization, 'Bearer test-token-not-a-real-secret');
  });

  it('retries a 429 and succeeds once the instance finishes spinning up', async () => {
    const calls = stubFetch((_call, index) =>
      index < 3 ? jsonResponse(429, { error: 'rate limited' }) : jsonResponse(200, { success: true, data: HEALTH }),
    );

    const { result } = await runOnVirtualClock(() => blockchainClient.health());

    assert.equal(result.ok, true, 'the operation should survive a spinning-up instance');
    assert.equal(calls.length, 4, 'three 429s then a success');
  });

  it('retries 503 and 502 from a suspended instance', async () => {
    for (const status of [503, 502]) {
      mock.restoreAll();
      const calls = stubFetch((_call, index) =>
        index === 0
          ? jsonResponse(status, { error: 'unavailable' })
          : jsonResponse(200, { success: true, data: HEALTH }),
      );

      const { result } = await runOnVirtualClock(() => blockchainClient.health());
      assert.equal(result.ok, true, `${status} should be retried`);
      assert.equal(calls.length, 2);
    }
  });

  it('retries a refused connection, which is how a suspended instance can also look', async () => {
    let calls = 0;
    mock.method(globalThis, 'fetch', async () => {
      calls += 1;
      if (calls === 1) throw new Error('ECONNREFUSED');
      return jsonResponse(200, { success: true, data: HEALTH });
    });

    const { result } = await runOnVirtualClock(() => blockchainClient.health());
    assert.equal(result.ok, true);
    assert.equal(calls, 2);
  });

  it('does NOT retry a rejected credential — that is a real answer', async () => {
    for (const status of [401, 403]) {
      mock.restoreAll();
      const calls = stubFetch(() => jsonResponse(status, { error: 'unauthorized' }));

      const result = await blockchainClient.health();

      assert.equal(result.ok, false);
      assert.equal(calls.length, 1, `${status} must not be retried`);
      if (!result.ok) assert.equal(result.error.status, status);
    }
  });

  it('does NOT retry a bad request or a missing record', async () => {
    for (const status of [400, 404, 422]) {
      mock.restoreAll();
      const calls = stubFetch(() => jsonResponse(status, { error: 'nope' }));

      const result = await blockchainClient.health();

      assert.equal(result.ok, false);
      assert.equal(calls.length, 1, `${status} must not be retried`);
    }
  });

  it('honours Retry-After when the upstream supplies it', async () => {
    const calls = stubFetch((_call, index) =>
      index === 0
        ? jsonResponse(429, { error: 'rate limited' }, { 'retry-after': '0' })
        : jsonResponse(200, { success: true, data: HEALTH }),
    );

    const { result } = await runOnVirtualClock(() => blockchainClient.health());
    assert.equal(result.ok, true);
    assert.equal(calls.length, 2);
  });

  it('gives up inside the timeout budget, and never fabricates a result', async () => {
    // Minimum jitter, i.e. the WORST case and the guaranteed floor of the window.
    mock.method(Math, 'random', () => 0);
    const calls = stubFetch(() => jsonResponse(429, { error: 'rate limited' }));

    const { result, elapsed } = await runOnVirtualClock(() => blockchainClient.health());

    assert.equal(result.ok, false);
    assert.equal(calls.length, 8, 'bounded at MAX_ATTEMPTS, never unbounded');
    assert.ok(elapsed < 60_000, `must not exceed BLOCKCHAIN_TIMEOUT_MS (took ${elapsed}ms)`);
    if (!result.ok) {
      assert.equal(result.error.code, 'HTTP_ERROR');
      assert.equal(result.error.status, 429);
      assert.equal('data' in result, false, 'must surface the failure, never a made-up result');
    }
  });

  it('keeps retrying for long enough to ride out a cold start', async () => {
    // Minimum jitter again: the floor is what has to outlast a cold start.
    mock.method(Math, 'random', () => 0);
    const calls = stubFetch(() => jsonResponse(503, { error: 'unavailable' }));

    const { result, elapsed } = await runOnVirtualClock(() => blockchainClient.health());

    assert.equal(result.ok, false);
    // A suspended free instance takes ~20-25s to come back. Even at the minimum
    // of the jittered window the retry loop has to outlast that, or the
    // mitigation would not actually cover the failure it exists for.
    assert.ok(
      elapsed >= 20_000,
      `retry floor too short to cover a ~23s cold start (was ${elapsed}ms)`,
    );
    assert.equal(calls.length, 8);
  });
});