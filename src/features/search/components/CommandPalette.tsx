import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  FileCode,
  Network,
  Search,
  UserCog,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  groupSearchResults,
  searchEntities,
  type SearchResult,
} from '@/features/search/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';

const GROUP_ICONS: Record<string, LucideIcon> = {
  Credentials: CreditCard,
  Users: UserCog,
  Institutions: Building2,
  Issuers: Users,
  Blocks: Network,
  Transactions: FileCode,
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/** Open the global command palette from anywhere in the app. */
export function triggerCommandPalette() {
  window.dispatchEvent(new CustomEvent('securex:command-search'));
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounced = useDebounce(query, 120);

  const groups = groupSearchResults(searchEntities(debounced));
  const flatItems = groups.flatMap((group) => group.items);
  const total = flatItems.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [debounced]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const close = useCallback(() => onClose(), [onClose]);

  const select = useCallback(
    (item: SearchResult) => {
      close();
      navigate(item.path);
    },
    [close, navigate],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, total - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (flatItems[activeIndex]) {
          select(flatItems[activeIndex]);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, total, activeIndex, flatItems, select, close]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search SecureX"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
      onClick={close}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-securex-xl animate-securex-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search credentials, users, issuers, blocks, transactions…"
            aria-label="Search SecureX"
            className="h-9 w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
          />
          <kbd className="shrink-0 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] text-neutral-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!debounced && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-neutral-500">
                Search credentials, users, institutions, issuers, blocks, and
                transactions. Press Enter on a result to open it.
              </p>
            </div>
          )}

          {debounced && total === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-neutral-700">No results</p>
              <p className="mt-1 text-xs text-neutral-500">
                Nothing matched “{query}”. Try a credential title, hash, or name.
              </p>
            </div>
          )}

          {renderResults(groups, activeIndex, setActiveIndex, select)}
        </div>
      </div>
    </div>
  );
}

function renderResults(
  groups: ReturnType<typeof groupSearchResults>,
  activeIndex: number,
  setActiveIndex: (index: number) => void,
  onSelect: (item: SearchResult) => void,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let offset = 0;

  for (const group of groups) {
    const Icon = GROUP_ICONS[group.group] ?? FileCode;
    const start = offset;
    offset += group.items.length;

    const items = group.items.map((item, index) => {
      const globalIndex = start + index;
      const isActive = globalIndex === activeIndex;
      return (
        <li key={`${group.group}-${item.id}`}>
          <button
            type="button"
            onMouseEnter={() => setActiveIndex(globalIndex)}
            onClick={() => onSelect(item)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              isActive
                ? 'bg-securex-50 text-securex-800'
                : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                isActive
                  ? 'bg-securex-600 text-white'
                  : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{item.label}</span>
              {item.description && (
                <span className="block truncate text-xs text-neutral-500">
                  {item.description}
                </span>
              )}
            </span>
          </button>
        </li>
      );
    });

    nodes.push(
      <div key={group.group} className="mb-3 last:mb-0">
        <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
          {group.group}
        </p>
        <ul className="space-y-1">{items}</ul>
      </div>,
    );
  }

  return nodes;
}