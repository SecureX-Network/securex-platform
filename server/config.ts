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

export const serverConfig = {
  environment: ENV as Environment,
  isProduction,
  port: Number(env('PORT', '4000')),
  host: env('HOST', 'localhost'),
  databaseUrl: resolvedDatabaseUrl,
  databasePoolMax: Number(env('DATABASE_POOL_MAX', '10')),
  dataMode,
  jwtSecret: requiredSecret('JWT_SECRET', DEV_JWT_FALLBACK, 32, DEV_JWT_FALLBACK),
  tokenTtl: env('JWT_TTL', '8h'),
  seedOnBoot: env('SEED_ON_BOOT', 'true') === 'true',
  // Downstream services probed by the Security Center health report.
  blockchainApiUrl: env('BLOCKCHAIN_API_URL', 'http://localhost:3001'),
  fraudEngineUrl: env('FRAUD_ENGINE_URL', 'http://localhost:4002/fraud'),
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