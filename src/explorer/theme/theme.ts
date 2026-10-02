// ---------------------------------------------------------------------------
// SECUREX BLOCKCHAIN EXPLORER — THEME RESOLUTION
//
// Deliberately framework-free. Both the pre-paint <script> in
// explorer/index.html and the React hook need the exact same answer to "which
// theme is active?", and a second, independent implementation of that answer
// is how a site ends up flashing light before dark. Keeping the rules here
// means there is one place to reason about.
//
// Resolution order (an explicit choice always beats the operating system):
//
//   1. an explicit stored preference          -> localStorage
//   2. the operating system preference        -> prefers-color-scheme
//   3. light, which is the product default
//
// The resolved theme is written to `document.documentElement` as the
// `dark-theme` class. That is the same convention `src/styles/globals.css`
// uses for the SecureX application, so both surfaces stay recognisably the
// same product.
//
// No third-party theming library is involved: the whole feature is one class,
// one storage key and a matchMedia subscription.
// ---------------------------------------------------------------------------

export type ExplorerTheme = 'light' | 'dark';

/** Storage key for an explicit user choice. Namespaced to the Explorer. */
export const THEME_STORAGE_KEY = 'securex-explorer-theme';

/**
 * The class the application already uses to mark dark mode. Light is the
 * default, so the class is purely additive and is absent in light mode.
 */
export const DARK_THEME_CLASS = 'dark-theme';

/**
 * Boot class. Set for one frame while the theme is applied so the global
 * colour transition on <body> cannot animate from the previous theme.
 */
export const THEME_BOOT_CLASS = 'theme-boot';

/** Browser chrome / address-bar colour, per theme. */
export const THEME_COLORS: Record<ExplorerTheme, string> = {
  light: '#f8fafc',
  dark: '#050505',
};

export const DEFAULT_THEME: ExplorerTheme = 'light';

/** Narrows an arbitrary stored/parsed value to a theme, or null if invalid. */
export function isExplorerTheme(value: unknown): value is ExplorerTheme {
  return value === 'light' || value === 'dark';
}

/**
 * The single decision function.
 *
 * Kept pure and total so it can be tested directly: `stored` is whatever was in
 * localStorage (possibly null, possibly corrupt) and `prefersDark` is what the
 * media query reported.
 */
export function resolveInitialTheme(
  stored: string | null,
  prefersDark: boolean,
): ExplorerTheme {
  if (isExplorerTheme(stored)) return stored;
  return prefersDark ? 'dark' : DEFAULT_THEME;
}

/** Reads the explicit preference, tolerating a blocked or absent storage. */
export function readStoredTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Private-mode Safari and some embedded webviews throw on access. A missing
    // preference simply means "fall back to the system", so this is survivable.
    return null;
  }
}

/** Writes the explicit preference, tolerating a blocked or full storage. */
export function writeStoredTheme(theme: ExplorerTheme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // A preference that cannot be persisted still applies for this session.
  }
}

/** Queries the operating system preference. */
export function prefersDarkColorScheme(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

/**
 * Applies a theme to the document.
 *
 * This is what `useTheme` calls after resolving, and what the inline head
 * script calls before React boots so the first paint is already correct.
 */
export function applyTheme(theme: ExplorerTheme): void {
  const root = document.documentElement;
  root.classList.toggle(DARK_THEME_CLASS, theme === 'dark');
  root.style.colorScheme = theme;

  // Keep the browser chrome in step; without this the address bar keeps the
  // previous theme's colour after a toggle.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLORS[theme];
}

/**
 * Resolves and applies the initial theme, returning what it resolved to.
 *
 * Called on mount: the inline script has already painted the correct theme, so
 * this keeps React's state in agreement with the DOM instead of second-guessing
 * it and re-painting.
 */
export function initialiseTheme(): ExplorerTheme {
  const theme = resolveInitialTheme(readStoredTheme(), prefersDarkColorScheme());
  applyTheme(theme);
  return theme;
}