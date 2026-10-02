import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ExplorerApp from './ExplorerApp';
import './styles/explorer.css';

// ---------------------------------------------------------------------------
// SECUREX BLOCKCHAIN EXPLORER — BROWSER ENTRY
//
// A separate mount from the SecureX application (`src/main.tsx`). This file is
// the only entry the dedicated Explorer build loads, which is what guarantees
// the Explorer's router and bundle can never be pulled into
// app-securex.sp-net.in.
//
// Theme note: the light/dark theme is applied by a tiny inline script in
// explorer/index.html *before* React boots, so there is no flash of the wrong
// theme. React only takes over the state afterwards, via `useTheme`. See
// src/explorer/theme/theme.ts for the resolution rules.
//
// Deliberately absent, compared with the application entry:
//   * no AuthProvider — the Explorer is public and has no accounts
//   * no session restore, no toaster
//   * no mock/demo bootstrap
// ---------------------------------------------------------------------------

const container = document.getElementById('root');
if (!container) {
  throw new Error('[explorer] Missing #root element in explorer/index.html');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <ExplorerApp />
    </BrowserRouter>
  </StrictMode>,
);
