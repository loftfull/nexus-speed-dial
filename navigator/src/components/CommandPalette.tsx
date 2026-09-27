import { KeyboardEvent, useEffect, useRef, useState } from "react";
import type { Site } from "../types";
import { cn } from "../utils/cn";
import { faviconUrl, hostOf } from "../utils/helpers";
import { Icons } from "./ui/Icons";

export function CommandPalette({
  open,
  query,
  onQueryChange,
  results,
  onSelect,
  onInfo,
  onClose,
  dark,
}: {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  results: Site[];
  onSelect: (site: Site) => void;
  onInfo: (id: string) => void;
  onClose: () => void;
  dark?: boolean;
}) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setActive(0), [query, open]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      if (e.shiftKey) onInfo(results[active].id);
      else onSelect(results[active]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-start bg-black/40 px-4 pt-[15vh] backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search sites"
        className={cn(
          "w-full max-w-2xl justify-self-center rounded-[24px] border p-2 shadow-2xl backdrop-blur-3xl animate-fade-in",
          dark ? "border-slate-700 bg-slate-900/95" : "border-white/70 bg-white/95",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-3 border-b border-black/5 px-3 py-2 dark:border-white/5">
          <Icons.Search className="h-5 w-5 text-slate-400" />
          <input
            autoFocus
            role="combobox"
            aria-label="Search query"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search by title, domain, tag, project…"
            className="flex-1 border-none bg-transparent py-2 text-base outline-none dark:text-white"
          />
          <kbd className="hidden rounded bg-black/5 px-2 py-1 font-mono text-[10px] text-slate-400 sm:block dark:bg-white/5">ESC</kbd>
        </div>

        <div ref={listRef} id="palette-results" role="listbox" className="max-h-[50vh] overflow-y-auto px-1 pb-1">
          {results.map((site, index) => (
            <div
              key={site.id}
              id={`palette-${site.id}`}
              role="option"
              aria-selected={index === active}
              data-index={index}
              onMouseEnter={() => setActive(index)}
              onClick={() => { onSelect(site); onClose(); }}
              className={cn(
                "group flex w-full cursor-pointer items-center gap-4 rounded-2xl px-4 py-3 text-left transition-colors",
                index === active && (dark ? "bg-white/8" : "bg-black/5"),
              )}
            >
              <img src={faviconUrl(site)} alt="" className="h-10 w-10 rounded-xl bg-white shadow-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold dark:text-white">{site.title}</p>
                <p className={cn("truncate text-xs", dark ? "text-slate-500" : "text-slate-400")}>
                  {hostOf(site.url)} · {site.project} / {site.category} / {site.group}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onInfo(site.id); onClose(); }}
                className={cn(
                  "rounded-lg bg-black/5 px-3 py-1.5 text-[11px] font-bold hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10",
                  index === active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                Details
              </button>
            </div>
          ))}
          {!results.length && (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400">No results for “{query}”</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-black/5 px-4 py-2 dark:border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{results.length} results</p>
          <div className="flex gap-4 text-[10px] text-slate-500">
            <span><kbd className="rounded bg-black/5 px-1.5 py-0.5 font-mono dark:bg-white/5">↵</kbd> Open</span>
            <span><kbd className="rounded bg-black/5 px-1.5 py-0.5 font-mono dark:bg-white/5">⇧↵</kbd> Details</span>
            <span><kbd className="rounded bg-black/5 px-1.5 py-0.5 font-mono dark:bg-white/5">↑↓</kbd> Navigate</span>
          </div>
        </div>
      </div>
    </div>
  );
}
