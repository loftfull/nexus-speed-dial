import { Site } from "../types";
import { cn } from "../utils/cn";
import { faviconUrl } from "../utils/helpers";
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-start px-4 pt-[15vh] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn(
          "w-full max-w-2xl rounded-[24px] border p-2 shadow-2xl backdrop-blur-3xl animate-fade-scale-in",
          dark ? "border-slate-700 bg-slate-900/95" : "border-white/70 bg-white/95",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-3 border-b border-black/5 px-3 py-2 dark:border-white/5">
          <Icons.Search className="w-5 h-5 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search anything..."
            className="flex-1 border-none bg-transparent py-2 text-base outline-none dark:text-white"
          />
          <kbd className="hidden rounded bg-black/5 px-2 py-1 text-[10px] font-mono text-slate-400 sm:block dark:bg-white/5">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto scrollbar-hide px-1 pb-1">
          {results.map((site, index) => (
            <button
              key={site.id}
              onClick={() => onSelect(site)}
              className={cn(
                "group flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all",
                dark ? "hover:bg-white/5" : "hover:bg-black/5",
              )}
            >
              <div className="relative">
                <img src={faviconUrl(site)} alt="" className="h-10 w-10 rounded-xl shadow-sm" />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
                  {index + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold dark:text-white">{site.title}</p>
                <p className={cn("truncate text-xs", dark ? "text-slate-500" : "text-slate-400")}>
                  {site.project} • {site.category} • {site.group}
                </p>
              </div>
              <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onInfo(site.id);
                  }}
                  className="rounded-lg bg-black/5 px-3 py-1.5 text-[11px] font-bold hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Details
                </button>
                <Icons.ExternalLink className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          ))}
          {!results.length && (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400">No results for “{query}”</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-black/5 px-4 py-2 dark:border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nexus Search Engine</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <kbd className="rounded bg-black/5 px-1.5 py-0.5 font-mono dark:bg-white/5">↵</kbd> Open
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <kbd className="rounded bg-black/5 px-1.5 py-0.5 font-mono dark:bg-white/5">↑↓</kbd> Navigate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
