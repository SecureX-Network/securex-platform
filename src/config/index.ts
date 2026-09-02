const env = import.meta.env;

const config = {
  API_URL: env.VITE_API_BASE_URL ?? 'http://localhost:4000/api',
  BLOCKCHAIN_API_URL: env.VITE_BLOCKCHAIN_API_URL ?? 'http://localhost:4001/blockchain',
  FRAUD_ENGINE_URL: env.VITE_FRAUD_ENGINE_URL ?? 'http://localhost:4002/fraud',
  APP_NAME: env.VITE_APP_NAME ?? 'SecureX',
  APP_VERSION: env.VITE_APP_VERSION ?? '1.0.0',
  IS_MOCK: env.VITE_USE_MOCK === 'true' || env.VITE_USE_MOCK === undefined,
} as const;

export default config;
