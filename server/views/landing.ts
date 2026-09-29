import type { Request } from 'express';
import { serverConfig } from '../config.js';
import type { HealthPayload } from '../services/health.js';

/**
 * Server-rendered landing page for `GET /`.
 *
 * Design constraints that shape this file:
 *  - `server/middleware/security.ts` sets `script-src 'self'` with no
 *    `unsafe-inline`, so the page ships **no JavaScript at all**. Every value
 *    below is interpolated at request time; nothing is fetched client-side.
 *  - `style-src` allows `'unsafe-inline'`, so the single inline <style> block is
 *    permitted and keeps the page a single self-contained response with no CDN
 *    or font dependency. It therefore renders even if the Vercel frontend is
 *    down.
 *  - The page is public. It renders only non-sensitive operational facts and
 *    never the connection string, host, credentials, tokens, or user data.
 */

/** Escape every interpolated value; the page is public and reflects request input. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const HOSTNAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/i;

function firstHeader(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/**
 * Derive the public base URL from the request so the page is correct in
 * production, preview, and local development without hardcoding a hostname.
 * Rendered inside a <title>/link only and escaped, and the value is strictly
 * validated so a crafted Host header cannot inject markup.
 */
function resolveBaseUrl(req: Request): string {
  const proto = firstHeader(req.headers['x-forwarded-proto']) || req.protocol || 'https';
  const host = firstHeader(req.headers['x-forwarded-host']) || firstHeader(req.headers.host);
  const scheme = proto.split(',')[0]?.trim() === 'http' ? 'http' : 'https';
  const hostname = host.split(',')[0]?.trim() ?? '';
  if (!hostname || !HOSTNAME_PATTERN.test(hostname)) return '';
  return `${scheme}://${hostname}`;
}

interface ApiPath {
  path: string;
  /** Public read-only endpoints are linked; everything else is shown as text. */
  access: 'public' | 'authenticated';
}

interface ApiArea {
  name: string;
  summary: string;
  paths: ApiPath[];
}

/**
 * Areas are derived from the routers actually mounted in `server/app.ts`
 * (auth, institutions, credentials, verifications, blockchain, explorer,
 * admin) and the paths declared in each `server/routes/*.ts`. Nothing here is
 * aspirational: each path corresponds to a real mounted route.
 */
const API_AREAS: ApiArea[] = [
  {
    name: 'Authentication',
    summary: 'Session issuance and identity verification for platform actors.',
    paths: [
      { path: '/api/auth/login', access: 'public' },
      { path: '/api/auth/register', access: 'public' },
      { path: '/api/auth/mfa/verify', access: 'public' },
      { path: '/api/auth/me', access: 'authenticated' },
    ],
  },
  {
    name: 'Credentials',
    summary: 'Credential lifecycle: issue, inspect, and revoke verifiable records.',
    paths: [
      { path: '/api/credentials', access: 'authenticated' },
      { path: '/api/credentials/:id/revoke', access: 'authenticated' },
    ],
  },
  {
    name: 'Verification',
    summary: 'Verification requests, search, and per-actor history.',
    paths: [
      { path: '/api/verifications', access: 'public' },
      { path: '/api/verifications/search', access: 'public' },
      { path: '/api/verifications/history', access: 'public' },
    ],
  },
  {
    name: 'Institutions',
    summary: 'Institution directory, issuance statistics, and audit logs.',
    paths: [
      { path: '/api/institutions', access: 'public' },
      { path: '/api/institutions/:id/stats', access: 'public' },
    ],
  },
  {
    name: 'Blockchain Ledger',
    summary: 'Permissioned ledger state, blocks, transactions, validators, and QR payloads.',
    paths: [
      { path: '/api/blockchain/health', access: 'public' },
      { path: '/api/blockchain/state', access: 'public' },
      { path: '/api/blockchain/validators', access: 'public' },
      { path: '/api/blockchain/metrics', access: 'public' },
    ],
  },
  {
    name: 'Explorer',
    summary: 'Read-only ledger and network statistics for public inspection.',
    paths: [
      { path: '/api/blocks', access: 'public' },
      { path: '/api/transactions', access: 'public' },
      { path: '/api/network/stats', access: 'public' },
    ],
  },
  {
    name: 'Administration',
    summary: 'Privileged platform operations. Reserved for authorized roles.',
    paths: [{ path: '/api/admin', access: 'authenticated' }],
  },
];

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  :root {
    --bg: #050505;
    --surface: #0E0E11;
    --accent: #3B82F6;
    --accent-2: #6D5EF5;
    --border: rgba(255, 255, 255, 0.08);
    --border-strong: rgba(255, 255, 255, 0.14);
    --text: #F4F4F5;
    --muted: #A1A1AA;
    --faint: #71717A;
    --ok: #34D399;
    --warn: #FBBF24;
  }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(720px 340px at 18% -8%, rgba(59, 130, 246, 0.16), transparent 70%),
      radial-gradient(620px 300px at 88% -4%, rgba(109, 94, 245, 0.14), transparent 72%);
  }
  .wrap { position: relative; max-width: 1000px; margin: 0 auto; padding: 48px 20px 64px; }
  header.brand { display: flex; align-items: center; gap: 12px; margin-bottom: 40px; }
  .mark {
    width: 34px; height: 34px; border-radius: 9px; flex: 0 0 auto;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    display: grid; place-items: center;
    font-weight: 700; font-size: 15px; color: #fff; letter-spacing: -0.02em;
  }
  .brand-name { font-weight: 700; letter-spacing: 0.14em; font-size: 13px; }
  .brand-sub {
    margin-left: auto; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
    color: var(--faint); border: 1px solid var(--border); border-radius: 999px; padding: 5px 12px;
  }
  h1 {
    margin: 0 0 8px; font-size: clamp(28px, 6vw, 40px); line-height: 1.15;
    letter-spacing: -0.03em; font-weight: 700;
  }
  .lede { margin: 0; color: var(--muted); font-size: clamp(15px, 2.4vw, 17px); max-width: 62ch; }
  .status {
    display: inline-flex; align-items: center; gap: 9px; margin: 22px 0 0;
    padding: 8px 16px 8px 13px; border: 1px solid var(--border-strong); border-radius: 999px;
    background: var(--surface); font-size: 13px; font-weight: 600; letter-spacing: 0.01em;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
  .dot.ok { background: var(--ok); box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.16); }
  .dot.warn { background: var(--warn); box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.16); }
  h2 {
    margin: 44px 0 16px; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase;
    color: var(--faint); font-weight: 600;
  }
  .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(168px, 1fr)); }
  .card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 15px 16px;
    min-width: 0;
  }
  .card dt { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--faint); margin: 0 0 7px; }
  .card dd { margin: 0; font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
  .value-ok { color: var(--ok); }
  .value-warn { color: var(--warn); }
  .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .row {
    display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 12px;
    padding: 13px 16px; border-top: 1px solid var(--border); align-items: baseline;
  }
  .row:first-child { border-top: 0; }
  .row dt { font-size: 13px; color: var(--faint); }
  .row dd { margin: 0; font-size: 14px; overflow-wrap: anywhere; }
  .areas { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); }
  .area h3 { margin: 0 0 5px; font-size: 15px; font-weight: 600; }
  .area p { margin: 0 0 12px; font-size: 13px; color: var(--muted); }
  code, .path {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 12.5px;
  }
  .path {
    display: block; padding: 5px 9px; border-radius: 7px; margin-top: 6px;
    background: rgba(255, 255, 255, 0.035); border: 1px solid var(--border);
    color: var(--muted); overflow-wrap: anywhere;
  }
  a.path { color: var(--text); text-decoration: none; }
  a.path:hover { border-color: rgba(59, 130, 246, 0.5); color: #fff; }
  a.path:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .tag {
    display: inline-block; margin-left: 7px; font-size: 10px; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--faint); border: 1px solid var(--border);
    border-radius: 5px; padding: 1px 5px; vertical-align: 1px;
  }
  .links { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .link {
    display: block; padding: 14px 16px; border: 1px solid var(--border); border-radius: 11px;
    background: var(--surface); text-decoration: none; color: var(--text); min-width: 0;
  }
  .link:hover { border-color: rgba(59, 130, 246, 0.5); }
  .link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .link b { display: block; font-size: 14px; font-weight: 600; }
  .link span { display: block; font-size: 12.5px; color: var(--faint); margin-top: 2px; overflow-wrap: anywhere; }
  footer {
    margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--border);
    display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 12.5px; color: var(--faint);
  }
  a { color: var(--accent); }
  a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  @media (max-width: 560px) {
    .wrap { padding: 32px 16px 48px; }
    .row { grid-template-columns: minmax(0, 1fr); gap: 3px; }
    .brand-sub { display: none; }
  }
`;

function favicon(): string {
  return (
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E" +
    "%3Crect width='32' height='32' rx='8' fill='%233B82F6'/%3E" +
    "%3Cpath d='M16 6.5l8 3.4v6.7c0 4.7-3.3 8.7-8 10.1-4.7-1.4-8-5.4-8-10.1V9.9l8-3.4z' fill='%23ffffff'/%3E" +
    '%3C/svg%3E'
  );
}

function renderPath(baseUrl: string, entry: ApiPath): string {
  const text = escapeHtml(entry.path);
  if (entry.access === 'public' && baseUrl) {
    return `<a class="path" href="${escapeHtml(`${baseUrl}${entry.path}`)}">${text}</a>`;
  }
  const tag =
    entry.access === 'authenticated' ? '<span class="tag">Auth</span>' : '';
  return `<span class="path">${text}${tag}</span>`;
}

export function renderLandingPage(req: Request, health: HealthPayload): string {
  const baseUrl = resolveBaseUrl(req);
  const e = escapeHtml;

  // Presentation-only labels. Derived from config rather than added to
  // HealthPayload, so the /api/health JSON contract stays byte-for-byte
  // unchanged (it reports the raw 'production' / 'real' values).
  const titleCase = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);
  const environmentLabel = titleCase(serverConfig.environment);
  const dataModeLabel = titleCase(health.dataMode);

  const databaseOk = health.database === 'connected';
  // Derived from the live health payload, never hardcoded: the badge and the
  // status cards always agree with what /api/health reports.
  const operational = databaseOk;
  const stateLabel = operational ? 'Operational' : 'Degraded';
  const apiState = operational ? 'Operational' : 'Degraded';
  const dbState = databaseOk ? 'Connected' : 'Unavailable';

  const areaCards = API_AREAS.map((area) => {
    const paths = area.paths.map((p) => `<li>${renderPath(baseUrl, p)}</li>`).join('');
    return `<li class="card area">
        <h3>${e(area.name)}</h3>
        <p>${e(area.summary)}</p>
        <ul style="list-style:none;margin:0;padding:0">${paths}</ul>
      </li>`;
  }).join('');

  const baseUrlDisplay = baseUrl || 'https://api-securex.sp-net.in';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SecureX API — Digital Credential Trust Network</title>
<meta name="description" content="SecureX Production API and system status for the Digital Credential Trust Network.">
<meta name="robots" content="index, follow">
<link rel="icon" href="${favicon()}">
<style>${STYLES}</style>
</head>
<body>
<div class="wrap">
  <header class="brand">
    <span class="mark" aria-hidden="true">S</span>
    <span class="brand-name">SECUREX</span>
    <span class="brand-sub">API / Trust Infrastructure</span>
  </header>

  <main>
    <h1>SecureX API</h1>
    <p class="lede">Digital Credential Trust Network — Production API</p>
    <p class="status" role="status">
      <span class="dot ${operational ? 'ok' : 'warn'}" aria-hidden="true"></span>
      <span>${e(stateLabel)}</span>
    </p>

    <h2 id="system-status">System Status</h2>
    <dl class="grid">
      <div class="card"><dt>API Status</dt><dd class="${operational ? 'value-ok' : 'value-warn'}">${e(apiState)}</dd></div>
      <div class="card"><dt>Database</dt><dd class="${databaseOk ? 'value-ok' : 'value-warn'}">${e(dbState)}</dd></div>
      <div class="card"><dt>Environment</dt><dd>${e(environmentLabel)}</dd></div>
      <div class="card"><dt>Data Mode</dt><dd>${e(dataModeLabel)}</dd></div>
      <div class="card"><dt>API Version</dt><dd>${e(health.version)}</dd></div>
    </dl>

    <h2 id="api-information">API Information</h2>
    <dl class="panel">
      <div class="row"><dt>Service</dt><dd><code>${e(health.service)}</code></dd></div>
      <div class="row"><dt>Base URL</dt><dd><a href="${e(baseUrlDisplay)}"><code>${e(baseUrlDisplay)}</code></a></dd></div>
      <div class="row"><dt>Health Endpoint</dt><dd><a href="${e(`${baseUrlDisplay}/api/health`)}"><code>/api/health</code></a></dd></div>
      <div class="row"><dt>Environment</dt><dd>${e(environmentLabel)}</dd></div>
      <div class="row"><dt>Data Mode</dt><dd>${e(dataModeLabel)}</dd></div>
      <div class="row"><dt>Database</dt><dd>PostgreSQL</dd></div>
    </dl>

    <h2 id="api-services">API Services</h2>
    <ul class="areas" style="list-style:none;margin:0;padding:0">${areaCards}</ul>

    <h2 id="quick-links">Quick Links</h2>
    <div class="links">
      <a class="link" href="${e(`${baseUrlDisplay}/api/health`)}">
        <b>Health Check</b><span>${e(`${baseUrlDisplay}/api/health`)}</span>
      </a>
      <a class="link" href="https://app-securex.sp-net.in/">
        <b>SecureX Application</b><span>https://app-securex.sp-net.in/</span>
      </a>
      <a class="link" href="https://securex.sp-net.in/">
        <b>SecureX Website</b><span>https://securex.sp-net.in/</span>
      </a>
    </div>
  </main>

  <footer>
    <span>Server time <code>${e(health.time)}</code></span>
    <span>SecureX Platform API v${e(health.version)}</span>
  </footer>
</div>
</body>
</html>`;
}
