import { useState } from "react";
import { Site, Prefs } from "../types";
import { cn } from "../utils/cn";
import { hostOf, faviconUrl, screenshotUrl } from "../utils/helpers";
import { TileMenu } from "./TileMenu";

function ScreenshotSkeleton() {
  return (
    <div className="flex h-full w-full animate-pulse items-center justify-center bg-slate-200/80 dark:bg-slate-800">
      <svg className="h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

function ScreenshotWithFallback({ src, fallbackSrc, className }: { src: string; fallbackSrc: string; className?: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-full w-full bg-slate-100 dark:bg-slate-900/50">
      {!loaded && <ScreenshotSkeleton />}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={imgSrc}
          alt=""
          className={cn("h-full w-full object-cover object-top scale-110 blur-2xl opacity-40 transition-opacity duration-300", !loaded && "opacity-0")}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-white/40 dark:via-slate-900/10 dark:to-slate-900/50" />
      </div>
      <img
        src={imgSrc}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setImgSrc(fallbackSrc)}
        className={cn("relative h-full w-full object-cover object-top transition duration-500", !loaded && "opacity-0 absolute inset-0", className)}
      />
    </div>
  );
}

export function SiteCard({
  site,
  prefs,
  theme,
  floatingShadow,
  onOpen,
  onCopy,
  onInfo,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  menuOpen,
  onToggleMenu,
  onDragStart,
  onDragOver,
  onDrop,
  selectionMode,
  selectedIds,
  onToggleSelection,
}: {
  site: Site;
  prefs: Prefs;
  theme: any;
  floatingShadow: string;
  onOpen: (s: Site) => void;
  onCopy: (s: Site) => void;
  onInfo: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (id: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
}) {
  const isNight = prefs.theme === "macNight";
  const isSelected = selectedIds?.has(site.id) ?? false;
  const isDraggable = !selectionMode && prefs.sort === "manual";

  return (
    <article
      draggable={isDraggable}
      onDragStart={() => onDragStart(site.id)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(site.id)}
      className={cn(
        "group relative overflow-hidden rounded-3xl border backdrop-blur-2xl transition duration-200",
        theme.card,
        floatingShadow,
        selectionMode && isSelected && "ring-2 ring-blue-500 opacity-90",
        prefs.automotiveMode ? "hover:shadow-xl" : "hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]",
      )}
    >
      {selectionMode ? (
        <div className="absolute right-2 top-2 z-20">
          <input
            type="checkbox"
            readOnly
            checked={isSelected}
            onClick={() => onToggleSelection?.(site.id)}
            className="h-6 w-6 rounded-full border-white bg-white/50 shadow-sm backdrop-blur-sm cursor-pointer"
          />
        </div>
      ) : (
        <div className="absolute right-1.5 top-1.5 z-20 flex items-center gap-0.5">
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(site.id)}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-lg text-sm transition bg-white/70 backdrop-blur-md shadow-sm border border-slate-200/50",
                site.favorite ? "text-amber-500" : "text-slate-400 opacity-0 group-hover:opacity-100 hover:text-amber-500"
              )}
            >
              {site.favorite ? "★" : "☆"}
            </button>
          )}
          <TileMenu
            compact
            open={menuOpen}
            onToggle={onToggleMenu}
            onOpen={() => onOpen(site)}
            onCopy={() => onCopy(site)}
            onInfo={() => onInfo(site.id)}
            onEdit={() => onEdit(site.id)}
            onDelete={() => onDelete(site.id)}
            onDuplicate={onDuplicate ? () => onDuplicate(site.id) : undefined}
            dark={isNight}
            site={site}
          />
        </div>
      )}

      {prefs.showScreenshot && (
        <button
          onClick={() => selectionMode ? onToggleSelection?.(site.id) : onOpen(site)}
          className={cn("block w-full overflow-hidden", prefs.automotiveMode ? "h-36" : "h-28 md:h-32")}
        >
          <ScreenshotWithFallback 
            src={screenshotUrl(site)} 
            fallbackSrc={`https://image.thum.io/get/width/800/noanimate/${site.url}`} 
            className="group-hover:scale-[1.03]"
          />
        </button>
      )}

      <button
        onClick={() => selectionMode ? onToggleSelection?.(site.id) : onOpen(site)}
        className={cn("flex w-full items-center gap-2.5 text-left", prefs.density === "compact" ? "p-2.5" : "p-3.5")}
      >
        <img
          src={faviconUrl(site)}
          alt=""
          className="shrink-0 rounded-2xl"
          style={{ width: prefs.iconSize, height: prefs.iconSize }}
        />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="overflow-x-auto whitespace-nowrap text-base font-semibold leading-tight [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {site.title}
            </p>
            {site.extractedAt && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" title="AI Enriched" />
            )}
          </div>
          <p
            className={cn(
              "overflow-x-auto whitespace-nowrap text-sm leading-tight [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              theme.subtle,
            )}
          >
            {hostOf(site.url)}
          </p>
        </div>
      </button>
    </article>
  );
}
