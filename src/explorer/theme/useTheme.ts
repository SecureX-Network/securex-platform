import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  initialiseTheme,
  isExplorerTheme,
  prefersDarkColorScheme,
  readStoredTheme,
  resolveInitialTheme,
  writeStoredTheme,
  type ExplorerTheme,
} from './theme';

export interface UseThemeResult {
  /** The theme currently painted. */
  theme: ExplorerTheme;
  /** Applies and persists an explicit choice. */
  setTheme: (next: ExplorerTheme) => void;
  /** Flips between light and dark. */
  toggleTheme: () => void;
  /**
   * True when the theme comes from an explicit stored choice rather than the
   * operating system. Used to decide whether to keep following the system.
   */
  hasExplicitPreference: boolean;
}

/**
 * Explorer theme state.
 *
 * Three behaviours matter and each is covered by a test:
 *
 *   * an explicit choice is persisted and survives a reload;
 *   * with no choice stored, the operating system decides;
 *   * with no choice stored, a live change of the operating system preference
 *     is followed (someone switching their laptop to dark mode at sunset
 *     should see the Explorer follow, not get stuck).
 *
 * Once the user picks a theme explicitly the system is no longer consulted —
 * otherwise a single click would appear to do nothing whenever the OS
 * preference happened to match it.
 */
export function useTheme(): UseThemeResult {
  // The inline head script has already set the correct class, so the initial
  // state is read from the same rules rather than from the DOM class alone:
  // that way an invalid stored value still resolves correctly.
  const [theme, setThemeState] = useState<ExplorerTheme>(() => initialiseTheme());
  const [hasExplicitPreference, setHasExplicitPreference] = useState(
    () => isExplorerTheme(readStoredTheme()),
  );

  const setTheme = useCallback((next: ExplorerTheme) => {
    applyTheme(next);
    writeStoredTheme(next);
    setThemeState(next);
    setHasExplicitPreference(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: ExplorerTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      writeStoredTheme(next);
      return next;
    });
    setHasExplicitPreference(true);
  }, []);

  // Follow the operating system only while the user has not chosen for
  // themselves. Reading `hasExplicitPreference` through a ref-free dependency
  // array is intentional: when it flips to true this subscription tears down.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');

    const onChange = (event: MediaQueryListEvent) => {
      if (isExplorerTheme(readStoredTheme())) return;
      const next: ExplorerTheme = event.matches ? 'dark' : 'light';
      applyTheme(next);
      setThemeState(next);
    };

    // Safari <14 only has the deprecated add/removeListener pair.
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }
    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, [hasExplicitPreference]);

  // A theme stored in another tab is a deliberate choice; honour it here too so
  // two open tabs never disagree about what is painted.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== 'securex-explorer-theme') return;
      const next = resolveInitialTheme(
        event.newValue,
        prefersDarkColorScheme(),
      );
      applyTheme(next);
      setThemeState(next);
      setHasExplicitPreference(isExplorerTheme(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { theme, setTheme, toggleTheme, hasExplicitPreference };
}