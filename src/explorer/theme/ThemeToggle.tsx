import { Moon, Sun } from 'lucide-react';
import { classNames } from '@/utils';
import type { ExplorerTheme } from '../theme/theme';
import { useTheme } from './useTheme';

const OPTIONS: { value: ExplorerTheme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

/**
 * Light / dark theme control.
 *
 * Accessibility notes:
 *
 *   * It is a `role="group"` of two real `<button>`s, so it is reachable by
 *     keyboard with no custom key handling — Tab moves between them and Enter
 *     or Space activates one. Nothing has to be re-implemented for it to work.
 *   * Each button carries `aria-pressed`, which is what announces the current
 *     state ("Light, pressed"). A single icon-only button that silently swaps
 *     its glyph would leave a screen-reader user with no way to tell which theme
 *     is active.
 *   * The active option also gets visible contrast and a ring, so the state is
 *     not conveyed by colour alone.
 *   * The group is labelled, and on small screens the text collapses to the
 *     icon, which still keeps the pressed state exposed via `aria-pressed`.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Colour theme"
      data-testid="theme-toggle"
      className={classNames(
        'inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-explorer-border bg-explorer-raised p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            title={`${label} theme`}
            className={classNames(
              'inline-flex h-7 items-center gap-1.5 rounded-[0.3125rem] px-2 text-xs font-medium transition-colors',
              active
                ? 'bg-explorer-surface text-explorer-accent-text shadow-securex ring-1 ring-inset ring-explorer-accent/30'
                : 'text-explorer-subtext hover:bg-explorer-hover hover:text-explorer-text',
            )}
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
            {/* Announced state for assistive tech even where the label is
                visually collapsed on small screens. */}
            <span className="sr-only">
              {active ? `${label} theme active` : `Switch to ${label.toLowerCase()} theme`}
            </span>
          </button>
        );
      })}
    </div>
  );
}