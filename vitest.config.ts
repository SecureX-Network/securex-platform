import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // Page/component tests render against the offline DEMO dataset. DEMO mode
    // fails closed in production (see src/config/index.ts), so the suite opts
    // in explicitly here. Tests that exercise REAL mode stub this back to
    // 'false' and re-import the module under test.
    env: { VITE_USE_MOCK: 'true' },
  },
});
