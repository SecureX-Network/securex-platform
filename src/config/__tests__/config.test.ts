import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveApiBaseUrl, resolveDataMode, config } from '../index';

/**
 * Phase 2 — the production `VITE_API_BASE_URL` fail-closed guard.
 *
 * The rule under test: a PRODUCTION bundle must never fall back to
 * `http://localhost:4000/api`. A deploy that forgets the one variable the
 * browser needs to reach its own backend should fail loudly at load, naming the
 * variable, rather than ship a bundle that silently points at a developer's
 * machine (or at nothing, since the deployed API's CORS policy would block
 * every request anyway).
 *
 * `resolveApiBaseUrl` takes `isProductionBuild` as a parameter so both branches
 * are reachable here; production always passes the real `import.meta.env.PROD`.
 */
describe('resolveApiBaseUrl — production fails closed', () => {
  it('refuses to build a production bundle with no VITE_API_BASE_URL', () => {
    expect(() => resolveApiBaseUrl(undefined, true)).toThrow(/VITE_API_BASE_URL is required/);
  });

  it('refuses an empty or whitespace-only value', () => {
    expect(() => resolveApiBaseUrl('', true)).toThrow(/VITE_API_BASE_URL is required/);
    expect(() => resolveApiBaseUrl('   ', true)).toThrow(/VITE_API_BASE_URL is required/);
  });

  it('names the variable and the expected shape so the failure is actionable', () => {
    let message = '';
    try {
      resolveApiBaseUrl(undefined, true);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('VITE_API_BASE_URL');
    expect(message).toContain('https://api-securex.sp-net.in/api');
    // It must also say what it refused to do, and why localhost is not an option.
    expect(message).toContain('Refusing to build');
    expect(message).toContain('http://localhost:4000/api');
  });

  it('rejects plaintext http in production (tokens must not cross the wire in clear)', () => {
    expect(() => resolveApiBaseUrl('http://api-securex.sp-net.in/api', true)).toThrow(
      /must use https/,
    );
  });

  it('rejects a value that is not an absolute URL', () => {
    expect(() => resolveApiBaseUrl('api-securex.sp-net.in/api', true)).toThrow(
      /not a valid absolute URL/,
    );
    expect(() => resolveApiBaseUrl('/api', true)).toThrow(/not a valid absolute URL/);
  });

  it('accepts the real production URL', () => {
    expect(resolveApiBaseUrl('https://api-securex.sp-net.in/api', true)).toBe(
      'https://api-securex.sp-net.in/api',
    );
  });

  it('normalizes a trailing slash so path joins never double up', () => {
    expect(resolveApiBaseUrl('https://api-securex.sp-net.in/api/', true)).toBe(
      'https://api-securex.sp-net.in/api',
    );
    expect(resolveApiBaseUrl('https://api-securex.sp-net.in/api///', true)).toBe(
      'https://api-securex.sp-net.in/api',
    );
  });

  it('trims surrounding whitespace from a pasted value', () => {
    expect(resolveApiBaseUrl('  https://api-securex.sp-net.in/api  ', true)).toBe(
      'https://api-securex.sp-net.in/api',
    );
  });
});

describe('resolveApiBaseUrl — development keeps the localhost default', () => {
  it('falls back to the local API outside a production build', () => {
    expect(resolveApiBaseUrl(undefined, false)).toBe('http://localhost:4000/api');
    expect(resolveApiBaseUrl('', false)).toBe('http://localhost:4000/api');
  });

  it('allows a local http API outside a production build', () => {
    expect(resolveApiBaseUrl('http://localhost:4000/api', false)).toBe('http://localhost:4000/api');
  });

  it('does not throw for a malformed URL outside a production build', () => {
    // Dev must not be blocked by a typo; the request will simply fail loudly
    // in the network layer, which is more useful than a blank screen.
    expect(resolveApiBaseUrl('localhost:4000/api', false)).toBe('localhost:4000/api');
  });
});

describe('resolveDataMode — demo mode is explicit opt-in', () => {
  it('is DEMO only for the exact string or boolean true', () => {
    expect(resolveDataMode('true')).toBe('DEMO');
    expect(resolveDataMode(true)).toBe('DEMO');
  });

  it('fails closed to REAL for anything else, including unset', () => {
    expect(resolveDataMode(undefined)).toBe('REAL');
    expect(resolveDataMode('false')).toBe('REAL');
    expect(resolveDataMode('1')).toBe('REAL');
    expect(resolveDataMode('yes')).toBe('REAL');
    expect(resolveDataMode('TRUE')).toBe('REAL');
  });
});

describe('the production guard is actually wired to import.meta.env.PROD', () => {
  // A regression guard for a real, silent failure. Vite statically substitutes
  // `import.meta.env.PROD` only in the DIRECT form. This module aliases
  // `import.meta.env` to a local `env` const, and that alias is replaced at
  // build time with an object holding only the `VITE_`-prefixed keys it
  // detected. `PROD` is not one of them, so an aliased `env.PROD` compiles to
  // `undefined` in a production bundle and every guard written against it is
  // inert: the build succeeds, ships, and silently keeps the localhost default.
  //
  // The functional behaviour cannot be observed from vitest, because in test
  // mode `import.meta.env.PROD` is false either way. Asserting the source form
  // is therefore the only way to keep this honest; the real proof is a
  // production `vite build` with the variable unset, which must fail closed.
  // Resolved from the vitest root rather than import.meta.url, which is an
  // http URL under the jsdom environment. Comment lines are stripped so the
  // prose explaining the hazard cannot satisfy (or trip) the assertions.
  const code = readFileSync(resolve(process.cwd(), 'src/config/index.ts'), 'utf8')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//'))
    .join('\n');

  it('reads PROD directly, never through the `env` alias', () => {
    expect(code).toMatch(/import\.meta\.env\.PROD/);
    expect(code).not.toMatch(/(?<!import\.meta\.)\benv\.PROD/);
  });

  it('keeps the alias for VITE_ lookups only', () => {
    // VITE_ keys ARE correctly inlined through the alias, so those reads are
    // fine and should stay idiomatic.
    expect(code).toMatch(/env\.VITE_API_BASE_URL/);
    expect(code).toMatch(/env\.VITE_USE_MOCK/);
  });
});

describe('config', () => {
  it('exposes an API URL with no trailing slash', () => {
    expect(config.API_URL.endsWith('/')).toBe(false);
  });

  it('keeps IS_MOCK and dataMode consistent', () => {
    expect(config.IS_MOCK).toBe(config.dataMode === 'DEMO');
  });

  it('holds no blockchain or fraud-engine address or credential', () => {
    // The browser must not be able to reach the downstream services or hold a
    // service token. Guarded so a future "quick fix" cannot reintroduce them.
    const keys = Object.keys(config);
    for (const forbidden of ['BLOCKCHAIN', 'FRAUD', 'TOKEN', 'SECRET', 'AUTH']) {
      expect(keys.filter((k) => k.includes(forbidden))).toEqual([]);
    }
  });
});
