import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// ---------------------------------------------------------------------------
// DEDICATED SECUREX BLOCKCHAIN EXPLORER BUILD
//
// This is a SEPARATE Vite build from the SecureX application (vite.config.ts).
// It shares the repository and the `@/` source aliases — so the Explorer reuses
// the same API client, blockchain DTOs, explorer service and design primitives
// as the app — but it produces an INDEPENDENT bundle in `dist-explorer/` with
// its own HTML entry and its own public route tree.
//
// Why a second build rather than a route inside the app:
//   1. `app-securex.sp-net.in` must keep behaving exactly as it does today.
//      A separate entry means the Explorer's router, theme and bundle can never
//      be loaded by the application, so there is no way to regress the app.
//   2. The Explorer is deployed to its own Vercel project, so the two sites
//      have independent cache keys, independent releases and independent
//      rollback.
//   3. The Explorer's HTML entry is what lets it own `/` and use root-relative
//      public URLs (`/blocks/0`) instead of the app's `/explorer/...` prefix.
//
// PRODUCTION DATA RULE: the Explorer must never render mock data. Data mode
// fails closed to REAL in `src/config/index.ts` (DEMO requires the exact
// string VITE_USE_MOCK=true), and the Explorer additionally asserts REAL mode
// at runtime in `src/explorer/services/chainApi.ts`. The Vercel project for
// this build sets VITE_API_BASE_URL and deliberately does NOT set VITE_USE_MOCK.
// ---------------------------------------------------------------------------

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // `root` is the Explorer directory so that `explorer/index.html` is emitted as
  // `index.html` at the root of the output directory. Vercel serves the
  // configured Output Directory as the site root and rewrites every unknown
  // path to `/index.html` for client-side routing, so the entry document has to
  // sit at the output root — not at `explorer/index.html`.
  //
  // The Explorer source itself lives in `src/explorer/`, outside this root, and
  // is reached from `index.html` with a relative `../src/...` specifier. The
  // shared `public/` assets and the `@/` alias are both pointed at the
  // repository explicitly so they resolve exactly as they do for the
  // application build.
  root: path.resolve(__dirname, 'explorer'),
  publicDir: path.resolve(__dirname, 'public'),
  server: {
    port: 3100,
    fs: {
      // Allow serving the shared src/ tree during `npm run dev:explorer`.
      allow: [__dirname],
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-explorer'),
    emptyOutDir: true,
    // Source maps are disabled for the public Explorer: it is an unauthenticated
    // surface and the application build's source maps are not needed here.
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'explorer/index.html'),
    },
  },
});
