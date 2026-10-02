import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeToggle } from '../theme/ThemeToggle';
import {
  DARK_THEME_CLASS,
  THEME_BOOT_CLASS,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  applyTheme,
  initialiseTheme,
  isExplorerTheme,
  resolveInitialTheme,
} from '../theme/theme';
import { useTheme } from '../theme/useTheme';

// ---------------------------------------------------------------------------
// EXPLORER LIGHT/DARK THEME
//
// The Explorer's contract with a visitor is small and worth stating plainly:
//
//   * light is the product default, and it must be the LIGHT presentation that
//     ships as default, not an afterthought;
//   * a visitor can switch to either theme without a page reload;
//   * an explicit choice is remembered across reloads and beats the operating
//     system;
//   * with no choice stored, the operating system decides — including when it
//     changes while the page is open.
//
// Everything below is driven through the real <html> class, real localStorage
// and a stubbed matchMedia, because those are exactly the surfaces that can
// silently disagree with each other.
// ---------------------------------------------------------------------------

/**
 * jsdom ships no `matchMedia`, so the stub is also the only way to *drive* a
 * system-preference change. It keeps a mutable `prefersDark` and lets a test
 * dispatch the `change` event a real browser would fire.
 */
function installMatchMedia(initialPrefersDark = false) {
  const state = {
    prefersDark: initialPrefersDark,
    listeners: new Set<(event: MediaQueryListEvent) => void>(),
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      get matches() {
        return state.prefersDark;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        state.listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        state.listeners.delete(listener);
      },
      // Deprecated pair, present for the Safari <14 branch in useTheme.
      addListener: (listener: (event: MediaQueryListEvent) => void) => {
        state.listeners.add(listener);
      },
      removeListener: (listener: (event: MediaQueryListEvent) => void) => {
        state.listeners.delete(listener);
      },
      dispatchEvent: () => false,
    }),
  });

  return {
    set(prefersDark: boolean) {
      state.prefersDark = prefersDark;
      for (const listener of state.listeners) {
        listener({ matches: prefersDark } as MediaQueryListEvent);
      }
    },
  };
}

function isDark(): boolean {
  return document.documentElement.classList.contains(DARK_THEME_CLASS);
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.style.colorScheme = '';
  document.head.innerHTML = '<meta name="theme-color" content="#f8fafc">';
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Pure resolution rules
// ---------------------------------------------------------------------------

describe('theme resolution', () => {
  it('narrows only the two real themes', () => {
    expect(isExplorerTheme('light')).toBe(true);
    expect(isExplorerTheme('dark')).toBe(true);
    // A corrupted or hand-edited storage value must not become a theme.
    expect(isExplorerTheme('solarized')).toBe(false);
    expect(isExplorerTheme(null)).toBe(false);
    expect(isExplorerTheme(undefined)).toBe(false);
  });

  it('defaults to light when nothing is stored and the system does not say otherwise', () => {
    expect(resolveInitialTheme(null, false)).toBe('light');
  });

  it('follows the system when there is no stored preference', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark');
    expect(resolveInitialTheme(null, false)).toBe('light');
  });

  it('lets an explicit stored preference beat the system in both directions', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark');
    expect(resolveInitialTheme('light', true)).toBe('light');
  });

  it('ignores an unusable stored value and falls back to the system', () => {
    expect(resolveInitialTheme('chartreuse', true)).toBe('dark');
    expect(resolveInitialTheme('', false)).toBe('light');
  });
});

describe('applyTheme', () => {
  it('marks dark by class and light by its absence', () => {
    applyTheme('dark');
    expect(isDark()).toBe(true);
    applyTheme('light');
    expect(isDark()).toBe(false);
  });

  it('keeps the browser chrome colour in step with the theme', () => {
    applyTheme('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      THEME_COLORS.dark,
    );
    applyTheme('light');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      THEME_COLORS.light,
    );
  });

  it('sets color-scheme so native form controls and scrollbars match', () => {
    applyTheme('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('still applies a theme when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });

    // Private-mode browsers throw on storage access; the theme must still work
    // for this session rather than leaving the page unstyled.
    expect(() => initialiseTheme()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Hook behaviour
// ---------------------------------------------------------------------------

describe('useTheme', () => {
  it('starts light when nothing is stored and the system is light', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(isDark()).toBe(false);
    expect(result.current.hasExplicitPreference).toBe(false);
  });

  it('starts dark when the system asks for dark and nothing is stored', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
    expect(isDark()).toBe(true);
    // Crucially the system choice is NOT written to storage, so "no explicit
    // preference" stays true and the OS remains in charge.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(result.current.hasExplicitPreference).toBe(false);
  });

  it('restores an explicit stored preference over the system preference', () => {
    installMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
    expect(result.current.hasExplicitPreference).toBe(true);
  });

  it('persists an explicit choice so it survives a reload', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme('dark'));

    expect(result.current.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(isDark()).toBe(true);

    // A reload is a fresh hook reading the same storage.
    const { result: afterReload } = renderHook(() => useTheme());
    expect(afterReload.current.theme).toBe('dark');
  });

  it('follows a live system change while the user has expressed no preference', () => {
    const media = installMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    act(() => media.set(true));

    expect(result.current.theme).toBe('dark');
    expect(isDark()).toBe(true);
  });

  it('stops following the system once the user has chosen explicitly', () => {
    const media = installMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme('light'));
    expect(result.current.hasExplicitPreference).toBe(true);

    act(() => media.set(true));

    // An explicit choice outranks the OS: this is the difference between a
    // toggle that works and one that appears to do nothing.
    expect(result.current.theme).toBe('light');
    expect(isDark()).toBe(false);
  });

  it('toggles between the two themes', () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('keeps two open tabs showing the same theme', () => {
    installMatchMedia(false);
    renderHook(() => useTheme());

    // A StorageEvent is how a change in one tab reaches another.
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: THEME_STORAGE_KEY,
          newValue: 'dark',
        }),
      );
    });

    expect(isDark()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The control itself
// ---------------------------------------------------------------------------

describe('ThemeToggle', () => {
  it('offers both themes in a labelled group', () => {
    installMatchMedia(false);
    render(<ThemeToggle />);

    const group = screen.getByRole('group', { name: /colour theme/i });
    expect(within(group).getByRole('button', { name: /light/i })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /dark/i })).toBeInTheDocument();
  });

  it('announces which theme is active', () => {
    installMatchMedia(false);
    render(<ThemeToggle />);

    const light = screen.getByRole('button', { name: /light theme active/i });
    const dark = screen.getByRole('button', { name: /switch to dark theme/i });
    expect(light).toHaveAttribute('aria-pressed', 'true');
    expect(dark).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to dark on click, with no page reload', async () => {
    const user = userEvent.setup();
    installMatchMedia(false);
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: /dark/i }));

    expect(isDark()).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: /dark theme active/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('switches back to light on click', async () => {
    const user = userEvent.setup();
    installMatchMedia(false);
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: /dark/i }));
    await user.click(screen.getByRole('button', { name: /light/i }));

    expect(isDark()).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('starts dark when the system asks for dark', () => {
    installMatchMedia(true);
    render(<ThemeToggle />);

    expect(isDark()).toBe(true);
    expect(screen.getByRole('button', { name: /dark theme active/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('is operable by keyboard alone', async () => {
    const user = userEvent.setup();
    installMatchMedia(false);
    render(<ThemeToggle />);

    // Real buttons, so no custom key handling is required for this to work:
    // Tab reaches the control and Enter/Space activate it.
    await user.tab();
    expect(screen.getByRole('button', { name: /light/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: /dark/i })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(isDark()).toBe(true);

    // Each option is absolute rather than a toggle, so activating "Dark" again
    // correctly stays dark. Shift back to Light and drive it with Space.
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: /light/i })).toHaveFocus();
    await user.keyboard(' ');
    expect(isDark()).toBe(false);
  });

  it('keeps every option reachable as a real button for assistive tech', () => {
    installMatchMedia(false);
    render(<ThemeToggle />);

    for (const button of screen.getAllByRole('button')) {
      // A button element with an explicit type never submits anything by
      // accident, and is announced as an activatable control.
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
    }
  });
});

// ---------------------------------------------------------------------------
// The pre-paint contract
// ---------------------------------------------------------------------------

describe('first paint', () => {
  it('uses a boot class to stop the theme transition animating on load', () => {
    // The inline head script adds `theme-boot` and drops it on the next frame.
    // If it were ever left on, every transition on the page would be dead.
    installMatchMedia(true);
    expect(THEME_BOOT_CLASS).toBe('theme-boot');

    document.documentElement.classList.add(THEME_BOOT_CLASS);
    applyTheme('dark');
    expect(document.documentElement.classList.contains(THEME_BOOT_CLASS)).toBe(true);
    expect(isDark()).toBe(true);
  });

  it('paints light before React runs when nothing is stored', () => {
    installMatchMedia(false);
    // This is what the boot script computes before first paint.
    expect(resolveInitialTheme(window.localStorage.getItem(THEME_STORAGE_KEY), false)).toBe('light');
  });

  it('loads the boot script from a same-origin file, not inline', async () => {
    // The deployment serves the Explorer under `script-src 'self'`, which
    // refuses inline scripts. An inline boot script was silently blocked in
    // production, which is exactly how the flash-of-wrong-theme it exists to
    // prevent came back. Nothing in the Explorer's own HTML may be inline.
    const html = await readFile(resolve(__dirname, '../../../explorer/index.html'), 'utf8');

    expect(html).toContain('<script src="/theme-boot.js">');
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/);

    // The file it points at must actually exist, or the page falls back to
    // painting light and then flipping -- the precise failure being guarded.
    const boot = await readFile(resolve(__dirname, '../../../public/theme-boot.js'), 'utf8');
    expect(boot).toContain("localStorage.getItem('securex-explorer-theme')");
    expect(boot).toContain('prefers-color-scheme: dark');
    expect(boot).toContain('theme-boot');
    expect(boot).toContain('dark-theme');
  });
});

// ---------------------------------------------------------------------------
// Header integration
// ---------------------------------------------------------------------------

describe('Explorer header', () => {
  async function renderShell() {
    const { ExplorerShell } = await import('../components/ExplorerShell');
    const { ExplorerChainProvider } = await import('../providers/ExplorerChainProvider');

    // The shell only needs the chain context for its status badge; a health
    // read that fails is a legitimate state the header must still render in.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    return render(
      <MemoryRouter>
        <ExplorerChainProvider>
          <ExplorerShell>
            <p>content</p>
          </ExplorerShell>
        </ExplorerChainProvider>
      </MemoryRouter>,
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('carries the SecureX brand and the Explorer sub-brand', async () => {
    installMatchMedia(false);
    await renderShell();

    expect(screen.getByText('SECUREX')).toBeInTheDocument();
    expect(screen.getByText('BLOCKCHAIN EXPLORER')).toBeInTheDocument();
  });

  it('describes itself in the product\'s own language', async () => {
    installMatchMedia(false);
    await renderShell();

    expect(
      screen.getByText(/public network visibility for the securex trust infrastructure/i),
    ).toBeInTheDocument();
  });

  it('has its own navigation, limited to the chain views', async () => {
    installMatchMedia(false);
    await renderShell();

    const nav = screen.getByRole('navigation', { name: /explorer sections/i });
    for (const label of ['Overview', 'Blocks', 'Transactions', 'Validators', 'Network']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('does not import application navigation that does not belong here', async () => {
    installMatchMedia(false);
    await renderShell();

    // The Explorer is a public chain view, not an authenticated product surface.
    for (const label of [/sign in/i, /issuers?/i, /credentials?/i, /holders?/i, /admin/i]) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    }
  });

  it('exposes a theme control and a link to the SecureX app', async () => {
    installMatchMedia(false);
    await renderShell();

    expect(screen.getByRole('group', { name: /colour theme/i })).toBeInTheDocument();

    const appLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === 'https://app-securex.sp-net.in/');
    expect(appLinks.length).toBeGreaterThan(0);
  });

  it('toggles the theme from the header without reloading', async () => {
    const user = userEvent.setup();
    installMatchMedia(false);
    await renderShell();

    expect(isDark()).toBe(false);

    await user.click(screen.getByRole('button', { name: /^dark/i }));

    expect(isDark()).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('renders its children in either theme', async () => {
    const user = userEvent.setup();
    installMatchMedia(true);
    await renderShell();

    // Dark from the system preference.
    expect(isDark()).toBe(true);
    expect(screen.getByText('content')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^light/i }));

    expect(isDark()).toBe(false);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('still renders when the chain cannot be read', async () => {
    installMatchMedia(false);
    await renderShell();

    // An unreachable chain must not take the shell down with it. The badge is
    // honest in the meantime — "Connecting", never a false "Operational" — and
    // only settles on "Unavailable" once the read has genuinely failed.
    expect(screen.getByText('SECUREX')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.getByTestId('network-status-badge')).toHaveTextContent(/connecting/i);

    // chainApi retries a transport failure twice before giving up.
    await waitFor(
      () =>
        expect(screen.getByTestId('network-status-badge')).toHaveTextContent(/unavailable/i),
      { timeout: 8000 },
    );
  });
});

describe('theme token coverage', () => {
  async function readTokens() {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('src/explorer/styles/explorer.css', 'utf8');

    // `:root` holds the light defaults; everything after the `html.dark-theme`
    // selector holds the dark overrides.
    const lightStart = css.indexOf(':root');
    const darkStart = css.indexOf('html.dark-theme {');
    expect(lightStart).toBeGreaterThan(-1);
    expect(darkStart).toBeGreaterThan(lightStart);

    const light = css.slice(lightStart, darkStart);
    const dark = css.slice(darkStart);

    const tokensIn = (block: string) =>
      [...block.matchAll(/(--x-[a-z0-9-]+)\s*:/g)].map((m) => m[1]!);

    return {
      css,
      light: new Set(tokensIn(light)),
      dark: new Set(tokensIn(dark)),
      referenced: new Set([...css.matchAll(/var\((--x-[a-z0-9-]+)/g)].map((m) => m[1]!)),
    };
  }

  it('gives every referenced token a light default', async () => {
    // A token with no value at all resolves to nothing, which shows up as an
    // invisible or unstyled element. `:root` is the base layer for both themes.
    const { light, referenced } = await readTokens();
    for (const token of referenced) {
      expect(light, `${token} is used but never defined`).toContain(token);
    }
  });

  it('never overrides a token the light theme does not define', async () => {
    // Custom properties inherit, so a dark-only token would still work. The
    // reverse is the real hazard: overriding something with no base leaves the
    // light theme reading a value nobody intended.
    const { light, dark } = await readTokens();
    for (const token of dark) {
      expect(light, `${token} is overridden in dark but has no light default`).toContain(token);
    }
  });

  it('bridges every Tailwind explorer token to its CSS variable', async () => {
    // The mechanism that makes one class name work in both themes: a Tailwind
    // colour must resolve to the custom property, not to a literal hex value.
    // A hard-coded hex here would silently re-introduce a single-theme colour.
    //
    // The config is read as text rather than imported: it is plain JS with no
    // declaration file, and this is a source-level contract either way.
    const { readFileSync } = await import('node:fs');
    const config = readFileSync('tailwind.config.js', 'utf8');

    const expected: Record<string, string> = {
      bg: '--x-bg',
      surface: '--x-surface',
      raised: '--x-raised',
      hover: '--x-hover',
      border: '--x-border',
      line: '--x-line',
      accent: '--x-accent',
      'accent-alt': '--x-accent-alt',
      'accent-solid': '--x-accent-solid',
      text: '--x-text',
      subtext: '--x-subtext',
      faint: '--x-faint',
      'accent-text': '--x-accent-text',
      'accent-alt-text': '--x-accent-alt-text',
      'on-accent': '--x-on-accent',
    };

    for (const [token, variable] of Object.entries(expected)) {
      const line = new RegExp(
        `\\b${token.replace(/[-]/g, '[-"]')}["']?\\s*:\\s*"[^"]*var\\(${variable}\\)`,
      );
      expect(config, `explorer.${token} must resolve to ${variable}`).toMatch(line);
    }

    for (const tone of ['ok', 'warn', 'bad', 'info'] as const) {
      expect(config, `${tone} must resolve to --x-${tone}`).toMatch(
        new RegExp(`\\b${tone}["']?\\s*:\\s*"[^"]*var\\(--x-${tone}\\)`),
      );
      expect(config, `${tone}-text must resolve to --x-${tone}-text`).toMatch(
        new RegExp(`"${tone}-text":\\s*"var\\(--x-${tone}-text\\)"`),
      );
    }

    // RGB triplets, not literal colours: this is what keeps `bg-ok/10` working.
    expect(config).toMatch(/rgb\(var\(--x-surface\) \/ <alpha-value>\)/);
    expect(config).toMatch(/rgb\(var\(--x-ok\) \/ <alpha-value>\)/);
  });

  it('keeps the brand accents identical across themes, as the design specifies', async () => {
    const { css } = await readTokens();
    const lightStart = css.indexOf(':root');
    const darkStart = css.indexOf('html.dark-theme {');
    const light = css.slice(lightStart, darkStart);
    const dark = css.slice(darkStart);

    // Royal Blue and Secondary Purple are product constants.
    expect(light).toContain('--x-accent: 59 130 246');
    expect(dark).toContain('--x-accent: 59 130 246');
    expect(light).toContain('--x-accent-alt: 109 94 245');
    expect(dark).toContain('--x-accent-alt: 109 94 245');
  });

  it('keeps the fixed dark surfaces the design specifies', async () => {
    const { css } = await readTokens();
    const dark = css.slice(css.indexOf('html.dark-theme {'));

    expect(dark).toContain('--x-bg: 5 5 5'); /* #050505 */
    expect(dark).toContain('--x-surface: 14 14 17'); /* #0E0E11 */
  });

  it('uses a separate, darker step for accent text than for accent fills', async () => {
    const { css } = await readTokens();
    const lightStart = css.indexOf(':root');
    const darkStart = css.indexOf('html.dark-theme {');
    const light = css.slice(lightStart, darkStart);

    // The brand blue reaches only ~3.7:1 against white: fine as a fill or a
    // border, but below WCAG AA for a text label. Text therefore uses a darker
    // step, and this test stops that separation being collapsed into one value.
    expect(light).toContain('--x-accent: 59 130 246');
    expect(light).toContain('--x-accent-text: #1558f5');
    expect(light).not.toMatch(/--x-accent-text:\s*#3b82f6/i);
  });
});