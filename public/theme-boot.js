/*
 * Apply the Explorer theme before first paint.
 *
 * Without this the document renders with the light tokens, and if the visitor
 * wants dark the whole page visibly flips once React mounts. This script
 * therefore mirrors the resolution rules in src/explorer/theme/theme.ts --
 * keep the two in step:
 *
 *   1. an explicit stored preference wins
 *   2. otherwise follow prefers-color-scheme
 *   3. otherwise light, the product default
 *
 * `theme-boot` suppresses colour transitions for this first paint.
 *
 * This lives in an external file rather than inline in explorer/index.html on
 * purpose. The deployment serves the site under a strict CSP
 * (`script-src 'self'`), which blocks inline scripts outright -- an inline
 * version was silently refused in production and reintroduced the flash it was
 * written to prevent. A same-origin file is allowed structurally, so there is
 * no CSP hash to keep in step with the source. It is loaded synchronously in
 * <head> without defer or async, so it still runs before the body is parsed
 * and therefore before first paint.
 */
(function () {
  try {
    var stored = window.localStorage.getItem('securex-explorer-theme');
    var prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme =
      stored === 'light' || stored === 'dark'
        ? stored
        : prefersDark
          ? 'dark'
          : 'light';

    var root = document.documentElement;
    root.classList.add('theme-boot');
    if (theme === 'dark') root.classList.add('dark-theme');
    root.style.colorScheme = theme;

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#050505' : '#f8fafc');
    }

    // Release the transition lock on the next frame, once the correct theme is
    // already on screen.
    window.requestAnimationFrame(function () {
      root.classList.remove('theme-boot');
    });
  } catch (e) {
    // Storage or matchMedia unavailable: the light default in the stylesheet is
    // a safe landing.
  }
})();