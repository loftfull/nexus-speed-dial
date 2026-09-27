import { useState } from "react";
import type { Prefs, Site } from "../types";
import { cn } from "../utils/cn";
import { faviconUrl, googleFavicon, hostOf, screenshotUrl, thumioUrl } from "../utils/helpers";
import { TileMenu } from "./TileMenu";

export type ThemeClasses = { card: string; subtle: string; isDark: boolean };

export type SiteActions = {
  onOpen: (s: Site) => void;
  onCopy: (s: Site) => void;
  onInfo: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleFavorite: (id: string) => void;
};

/** Favicon with a two-step fallback: custom icon → Google favicon service → first letter. */
export function SiteIcon({ site, size, className }: { site: Site; size: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(faviconUrl(site));
  if (!src) {
    return (
      <span
        aria-hidden
        className={cn("grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 font-semibold text-slate-600", className)}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
      >
        {site.title.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={cn("shrink-0 rounded-2xl bg-white/60 object-contain", className)}
      style={{ width: size, height: size }}
      onError={() => setSrc(src === googleFavicon(site.url) ? null : googleFavicon(site.url))}
    />
  );
}

function Screenshot({ site }: { site: Site }) {
  const [src, setSrc] = useState(screenshotUrl(site));
  const [state, setState] = useState<"loading" | "ok" | "failed">("loading");
  return (
    <div className="relative h-full w-full bg-slate-100 dark:bg-slate-900/50">
      {state !== "ok" && (
        <div className={cn("absolute inset-0 grid place-items-center", state === "loading" && "skeleton")}>
          {state === "failed" && <SiteIcon site={site} size={40} />}
        </div>
      )}
      {state !== "failed" && (
        <img
          src={src}
          alt=""
          loading="lazy"
          onLoad={() => setState("ok")}
          onError={() => {
            const fallback = thumioUrl(site.url);
            if (src !== fallback) setSrc(fallback);
            else setState("failed");
          }}
          className={cn("h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]", state !== "ok" && "opacity-0")}
        />
      )}
    </div>
  );
}

export function SiteCard({
  site,
  prefs,
  theme,
  actions,
  menuOpen,
  onToggleMenu,
  selectionMode,
  selected,
  onToggleSelection,
  hotkey,
}: {
  site: Site;
  prefs: Prefs;
  theme: ThemeClasses;
  actions: SiteActions;
  menuOpen: boolean;
  onToggleMenu: () => void;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelection: (id: string) => void;
  /** 1–9 when the site can be opened with a number key. */
  hotkey?: number;
}) {
  const activate = () => (selectionMode ? onToggleSelection(site.id) : actions.onOpen(site));
  const compact = prefs.density === "compact";

  const controls = selectionMode ? (
    <input
      type="checkbox"
      aria-label={`Select ${site.title}`}
      checked={selected}
      onChange={() => onToggleSelection(site.id)}
      className="h-5 w-5 cursor-pointer accent-blue-600"
    />
  ) : (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label={site.favorite ? `Remove ${site.title} from favorites` : `Add ${site.title} to favorites`}
        aria-pressed={site.favorite}
        onClick={() => actions.onToggleFavorite(site.id)}
        className={cn(
          "grid h-7 w-7 place-items-center rounded-lg text-sm transition",
          prefs.view === "cards" && "border border-slate-200/50 bg-white/70 shadow-sm backdrop-blur-md",
          site.favorite ? "text-amber-500" : "text-slate-400 opacity-0 hover:text-amber-500 focus-visible:opacity-100 group-hover:opacity-100",
        )}
      >
        {site.favorite ? "★" : "☆"}
      </button>
      <TileMenu
        compact
        open={menuOpen}
        onToggle={onToggleMenu}
        onOpen={actions.onOpen}
        onCopy={actions.onCopy}
        onInfo={actions.onInfo}
        onEdit={actions.onEdit}
        onDelete={actions.onDelete}
        onDuplicate={actions.onDuplicate}
        dark={theme.isDark}
        site={site}
      />
    </div>
  );

  const enrichedDot = site.extractedAt && (
    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" title="Enriched with metadata/AI" />
  );

  if (prefs.view === "list") {
    return (
      <article className={cn("group relative flex items-center gap-3 rounded-2xl border px-3 backdrop-blur-2xl transition", theme.card, compact ? "py-1.5" : "py-2.5", selected && "ring-2 ring-blue-500")}>
        <button type="button" onClick={activate} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <SiteIcon site={site} size={Math.min(prefs.iconSize, 36)} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">{site.title}</span>
              {enrichedDot}
            </span>
            <span className={cn("block truncate text-xs", theme.subtle)}>{hostOf(site.url)}{site.description && ` — ${site.description}`}</span>
          </span>
          <span className={cn("hidden shrink-0 text-xs md:block", theme.subtle)}>{site.project} / {site.category}</span>
          {hotkey && <kbd className={cn("hidden shrink-0 font-mono text-[10px] lg:block", theme.subtle)}>{hotkey}</kbd>}
        </button>
        {controls}
      </article>
    );
  }

  if (prefs.view === "icons") {
    return (
      <article className={cn("group relative flex flex-col items-center rounded-3xl border backdrop-blur-2xl transition", theme.card, compact ? "p-3" : "p-4", selected && "ring-2 ring-blue-500")}>
        <div className="absolute right-1 top-1 z-20">{controls}</div>
        <button type="button" onClick={activate} className="flex w-full flex-col items-center gap-2 pt-2 text-center">
          <SiteIcon site={site} size={prefs.iconSize} />
          <span className="w-full truncate text-[13px] font-semibold">{site.title}</span>
        </button>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-3xl border backdrop-blur-2xl transition duration-200 hover:shadow-xl",
        theme.card,
        selected && "ring-2 ring-blue-500",
      )}
    >
      <div className="absolute right-1.5 top-1.5 z-20">{controls}</div>

      {prefs.showScreenshot && (
        <button type="button" tabIndex={-1} aria-hidden onClick={activate} className="block h-28 w-full overflow-hidden md:h-32">
          <Screenshot site={site} />
        </button>
      )}

      <button type="button" onClick={activate} className={cn("flex w-full items-center gap-2.5 text-left", compact ? "p-2.5" : "p-3.5")}>
        <SiteIcon site={site} size={prefs.iconSize} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-base font-semibold leading-tight">{site.title}</p>
            {enrichedDot}
          </div>
          <p className={cn("truncate text-sm leading-tight", theme.subtle)}>{hostOf(site.url)}</p>
        </div>
        {hotkey && <kbd className={cn("ml-auto hidden shrink-0 self-end font-mono text-[10px] lg:block", theme.subtle)}>{hotkey}</kbd>}
      </button>
    </article>
  );
}
