function env(key: string, fallback: string = ''): string {
  const v = process.env[key];
  return v !== undefined && v !== '' ? v : fallback;
}

// ── Environment ──────────────────────────────────────────────────
// APP_ENV drives safety-critical behavior: secret enforcement and
// demo-mode restrictions, mirroring the SecureX Control Center config.
const ENV = env('APP_ENV', 'development');
export type Environment = 'development' | 'staging' | 'production' | 'test';
const isProduction = ENV === 'production';

// ── Secrets: fail closed in production ───────────────────────────
const DEV_JWT_FALLBACK = 'securex-platform-dev-only-jwt-secret-change-me';

function requiredSecret(key: string, devFallback: string, minLength: number, mustDifferFrom: string): string {
  const value = env(key, '');
  if (isProduction) {
    if (!value) {
      throw new Error(`[config] FATAL: ${key} is required in production. Refusing to start with an unset secret.`);
    }
    if (value.length < minLength) {
      throw new Error(`[config] FATAL: ${key} must be at least ${minLength} characters in production (got ${value.length}).`);
    }
    if (value === mustDifferFrom) {
      throw new Error(`[config] FATAL: ${key} must not use the development fallback in production.`);
    }
    return value;
  }
  const resolved = value || devFallback;
  if (value && value === mustDifferFrom) {
    throw new Error(`[config] FATAL: ${key} must not use the development fallback in a non-default configuration.`);
  }
  return resolved;
}

// ── Cross-origin policy ──────────────────────────────────────────
const CORS_ORIGINS = (env('CORS_ORIGINS', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean));

if (isProduction && CORS_ORIGINS.length === 0) {
  throw new Error(
    '[config] FATAL: CORS_ORIGINS must be set in production to the exact allowed origins ' +
    '(comma-separated). Refusing to start with an unrestricted cross-origin policy.',
  );
}
if (CORS_ORIGINS.includes('*')) {
  throw new Error('[config] FATAL: CORS_ORIGINS must not contain "*" for the authenticated platform API.');
}

function resolveAllowedOrigins(): string[] {
  if (CORS_ORIGINS.length > 0) return CORS_ORIGINS;
  // Development convenience: the Vite dev server for this frontend (port 3000)
  // and the local API origin. Never applied in production (guarded above).
  return ['http://localhost:3000', 'http://127.0.0.1:3000'];
}

// ── Demo mode guard for production ───────────────────────────────
const dataMode: 'real' | 'demo' = env('DATA_MODE', 'demo') === 'real' ? 'real' : 'demo';
if (isProduction && dataMode === 'demo') {
  if (env('ALLOW_DEMO_DATA', '') !== 'allow') {
    throw new Error(
      '[config] FATAL: DATA_MODE=demo is not allowed in production. Set DATA_MODE=real, ' +
      'or set ALLOW_DEMO_DATA=allow only for isolated demo deployments.',
    );
  }
}

// ── PostgreSQL connection ─────────────────────────────────────────
// The real DATABASE_URL is mandatory in production (fail closed). In the test
// environment TEST_DATABASE_URL wins so the integration suite can never touch
// the development/production database by accident.
const DEV_DATABASE_URL = 'postgres://localhost:5432/securex';
const TEST_DATABASE_URL_DEFAULT = 'postgres://localhost:5432/securex_test';

const rawDatabaseUrl = env('DATABASE_URL', '');
if (isProduction && !rawDatabaseUrl) {
  throw new Error(
    '[config] FATAL: DATABASE_URL is required in production. Refusing to start without a PostgreSQL connection.',
  );
}

const resolvedDatabaseUrl =
  rawDatabaseUrl ||
  env('TEST_DATABASE_URL', ENV === 'test' ? TEST_DATABASE_URL_DEFAULT : DEV_DATABASE_URL);

// Public API version reported by /api/health and the GET / status page.
// Declared here rather than imported so the compiled server does not need
// package.json at runtime; keep it in step with the `version` field there.
const API_VERSION = '1.0.0';

export const serverConfig = {
  environment: ENV as Environment,
  isProduction,
  apiVersion: API_VERSION,
  port: Number(env('PORT', '4000')),
  host: env('HOST', 'localhost'),
  databaseUrl: resolvedDatabaseUrl,
  databasePoolMax: Number(env('DATABASE_POOL_MAX', '10')),
  dataMode,
  jwtSecret: requiredSecret('JWT_SECRET', DEV_JWT_FALLBACK, 32, DEV_JWT_FALLBACK),
  tokenTtl: env('JWT_TTL', '8h'),
  /**
   * Seed the canonical demo dataset into a FRESH database (guarded by the
   * `schema_meta.seeded` marker, so an existing database is never touched).
   *
   * DEFAULTS TO OFF IN PRODUCTION, ON everywhere else. The seed inserts
   * privileged accounts (ADMIN, SECURITY_ADMIN, NETWORK_ADMIN, AUDITOR) that
   * all share the plaintext password `Password123!`, plus synthetic sessions
   * and fake ledger history. That is fine for local DEMO/REAL development and
   * unacceptable as a silent side effect of deploying to a production
   * database, so production must opt in deliberately.
   *
   * A deliberately-provisioned production demo deployment sets
   * `SEED_ON_BOOT=true` (and, for DATA_MODE=demo, `ALLOW_DEMO_DATA=allow`).
   */
  seedOnBoot: env('SEED_ON_BOOT', isProduction ? 'false' : 'true') === 'true',
  // ── Downstream services, addressed SERVER-SIDE ONLY ──────────────────────
  // These credentials are read from the process environment and must never be
  // exported to a VITE_* variable, inlined into a frontend bundle, or echoed
  // back in any API response. The browser has no address and no credential for
  // these services; it can only ask this Platform API, which authorizes the
  // caller first and proxies the operation through server/services/blockchain.ts.
  blockchainApiUrl: env('BLOCKCHAIN_API_URL', 'http://localhost:3001'),
  /**
   * Credential presented to the blockchain service. NEVER a VITE_* variable.
   * When empty, privileged chain operations are refused with an explicit
   * UNAVAILABLE result by the server-side client rather than being attempted
   * unauthenticated or silently reported as success.
   */
  blockchainAuthToken: env('BLOCKCHAIN_AUTH_TOKEN', ''),
  blockchainTimeoutMs: Number(env('BLOCKCHAIN_TIMEOUT_MS', '10000')),
  /**
   * Which ON-CHAIN issuer identity this platform anchors credentials under.
   *
   * This is deliberately NOT the platform's own issuer ids. The chain custodies
   * the issuer Ed25519 private key (the platform never sees it, and must never
   * hold it), and it only publishes credentials signed by a key it holds. So the
   * only issuer the platform can legitimately anchor as is the one the chain
   * provisioned for itself at boot. Must match the node's CTN_ISSUER_ID.
   */
  blockchainIssuerId: env('BLOCKCHAIN_ISSUER_ID', 'securex-issuer'),
  /**
   * How long to wait for a submitted transaction to be committed into a block
   * before reporting the anchor as unconfirmed. The chain produces a block on
   * its configured interval (5s in production), so this only needs to cover one
   * or two block intervals.
   */
  blockchainAnchorTimeoutMs: Number(env('BLOCKCHAIN_ANCHOR_TIMEOUT_MS', '20000')),
  fraudEngineUrl: env('FRAUD_ENGINE_URL', 'http://localhost:4002/fraud'),

  // ── One-time ADMIN bootstrap (server-side CLI only) ───────────────────────
  // Production starts with zero users (SEED_ON_BOOT=false) and public
  // registration cannot mint privileged roles, so these four variables are how
  // an operator creates the very first ADMIN exactly once
  // (`npm run bootstrap:admin`). They are read ONLY by
  // server/services/adminBootstrap.ts and are never exposed over HTTP, never
  // sent to the browser, and never logged.
  //
  //   BOOTSTRAP_ADMIN_SECRET     the value stored in the service environment
  //   BOOTSTRAP_ADMIN_TOKEN      proof-of-possession supplied when running the
  //                              command; must equal the secret
  //   BOOTSTRAP_ADMIN_EMAIL      admin login email
  //   BOOTSTRAP_ADMIN_NAME       admin display name
  //   BOOTSTRAP_ADMIN_PASSWORD   admin password (hashed with bcrypt on insert)
  bootstrapAdminSecret: env('BOOTSTRAP_ADMIN_SECRET', ''),
  bootstrapAdminEmail: env('BOOTSTRAP_ADMIN_EMAIL', ''),
  bootstrapAdminName: env('BOOTSTRAP_ADMIN_NAME', ''),
  bootstrapAdminPassword: env('BOOTSTRAP_ADMIN_PASSWORD', ''),
  allowedOrigins: resolveAllowedOrigins(),
  rateLimit: {
    defaultWindowMs: Number(env('RATE_LIMIT_DEFAULT_WINDOW_MS', '60000')),
    defaultMax: Number(env('RATE_LIMIT_DEFAULT_MAX', '150')),
    authWindowMs: Number(env('RATE_LIMIT_AUTH_WINDOW_MS', '60000')),
    authMax: Number(env('RATE_LIMIT_AUTH_MAX', '10')),
    adminWindowMs: Number(env('RATE_LIMIT_ADMIN_WINDOW_MS', '60000')),
    adminMax: Number(env('RATE_LIMIT_ADMIN_MAX', '40')),
    verifyWindowMs: Number(env('RATE_LIMIT_VERIFY_WINDOW_MS', '60000')),
    verifyMax: Number(env('RATE_LIMIT_VERIFY_MAX', '60')),
  },
} as const;