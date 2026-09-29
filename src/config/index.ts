// ---------------------------------------------------------------------------
// SINGLE AUTHORITATIVE FRONTEND CONFIGURATION.
//
// `src/config/index.ts` is the ONLY place that reads `import.meta.env`.
// `src/constants/index.ts` re-exports the resolved values, so every existing
// `import { IS_MOCK, API_BASE_URL } from '@/constants'` keeps working while
// there is exactly one definition of each variable.
//
// SECURITY RULES enforced here:
//   1. DEMO/mock mode is EXPLICIT OPT-IN ONLY and fails closed. Any value that
//      is not the exact string 'true' resolves to REAL mode, so an unset
//      VITE_USE_MOCK (or a typo, or '1', or 'yes') can never silently put a
//      production build into demo mode. There is deliberately NO
//      `!== 'false'` / `=== undefined` default-to-mock branch.
//   2. The browser has NO blockchain service URL and NO blockchain credential.
//      The SecureX browser never talks to the blockchain service directly; it
//      only ever calls the Platform API, which holds the service credential
//      server-side. Do NOT add VITE_BLOCKCHAIN_* variables back to this file.
//   3. A PRODUCTION BUILD fails closed without an explicit API base URL. The
//      `http://localhost:4000/api` fallback is a development convenience only;
//      shipping it in a production bundle would produce an app that silently
//      talks to a developer's laptop (or to nothing at all, since every request
//      would be cross-origin and blocked by the deployed API's CORS policy), so
//      the bundle now throws instead. See resolveApiBaseUrl below.
// ---------------------------------------------------------------------------

const env = import.meta.env;

export type DataMode = 'REAL' | 'DEMO';

/** The development-only Platform API address. Never used in a production build. */
const DEV_API_BASE_URL = 'http://localhost:4000/api';

/**
 * True for a bundle built by `vite build` (the mode Vercel runs).
 *
 * IMPORTANT: `import.meta.env.PROD` must be read DIRECTLY, never through the
 * `env` alias above. Vite statically substitutes `import.meta.env.PROD` only in
 * the direct form; once `import.meta.env` is assigned to a variable, Vite
 * replaces that variable with an object holding only the `VITE_`-prefixed keys
 * it detected, and `PROD` is silently absent — so an aliased `env.PROD` is
 * `undefined` in a production build and any guard written against it is inert.
 * Keep this as a direct property access.
 */
const IS_PRODUCTION_BUILD = import.meta.env.PROD === true;

/**
 * Resolve the data mode.
 *
 *   'true'  -> DEMO (explicit opt-in, richly mocked data, no live services)
 *   'false' -> REAL
 *   unset   -> REAL (fail closed)
 */
export function resolveDataMode(raw: string | boolean | undefined): DataMode {
  return raw === true || raw === 'true' ? 'DEMO' : 'REAL';
}

const dataMode = resolveDataMode(env.VITE_USE_MOCK as string | boolean | undefined);

/**
 * Resolve the Platform API base URL, failing closed in a production build.
 *
 * A missing or blank `VITE_API_BASE_URL` in a production build is refused,
 * not papered over: it means the deploy pipeline forgot to set the one variable
 * the browser needs to reach its own backend. Failing here — loudly, naming the
 * variable — is far cheaper than a bundle that deploys cleanly and then blocks
 * every request in the browser against a developer's `localhost`.
 *
 * WHEN this throws: this module is client source, so the check runs in the
 * BROWSER, not during `vite build`. A misconfigured deploy still builds
 * successfully and then renders a blank app with this message in the console.
 * That is intentional and fail-closed — no localhost fallback, no half-working
 * bundle — but it means a smoke test of the deployed app is part of release
 * verification, not just a green build.
 *
 * A value that is present but not a valid absolute URL is also refused, and in
 * production it must be https, so a typo or a pasted shell fragment cannot
 * produce a bundle that builds and then leaks requests over plaintext.
 *
 * Outside a production build the localhost default stands, so `npm run dev` and
 * the unit tests work with no configuration at all.
 *
 * `isProductionBuild` is a parameter rather than a module constant purely so
 * both branches are reachable from tests; production always passes the real
 * value of IS_PRODUCTION_BUILD.
 */
export function resolveApiBaseUrl(
  raw: string | undefined,
  isProductionBuild: boolean = IS_PRODUCTION_BUILD,
): string {
  const value = typeof raw === 'string' ? raw.trim() : '';

  if (!value) {
    if (isProductionBuild) {
      throw new Error(
        '[config] FATAL: VITE_API_BASE_URL is required in a production build. ' +
          'Set it to the deployed Platform API origin (e.g. https://api-securex.sp-net.in/api) ' +
          'in the Vercel environment variables. Refusing to build a bundle that would ' +
          `default to ${DEV_API_BASE_URL}.`,
      );
    }
    return DEV_API_BASE_URL;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    if (isProductionBuild) {
      throw new Error(
        `[config] FATAL: VITE_API_BASE_URL is not a valid absolute URL: ${value}. ` +
          'It must be a full origin such as https://api-securex.sp-net.in/api.',
      );
    }
    return value;
  }

  if (isProductionBuild && parsed.protocol !== 'https:') {
    throw new Error(
      `[config] FATAL: VITE_API_BASE_URL must use https in a production build (got ${parsed.protocol}//${parsed.host}). ` +
        'A production bundle must not send bearer tokens or credentials over plaintext HTTP.',
    );
  }

  // Normalize away trailing slashes so callers can always join `${base}/path`
  // without producing a double slash.
  return value.replace(/\/+$/, '');
}

export const config = {
  /** SecureX Platform API base (the only backend the browser may call). */
  API_URL: resolveApiBaseUrl(env.VITE_API_BASE_URL as string | undefined),
  APP_NAME: env.VITE_APP_NAME ?? 'SecureX',
  APP_VERSION: env.VITE_APP_VERSION ?? '1.0.0',
  dataMode,
  /** True only when DEMO mode was explicitly requested. */
  IS_MOCK: dataMode === 'DEMO',
} as const;

export default config;
