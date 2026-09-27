import { ReactNode } from "react";
import { cn } from "../utils/cn";

import { Site } from "../types";

export function TileMenu({
  open,
  compact,
  site,
  onToggle,
  onOpen,
  onCopy,
  onInfo,
  onEdit,
  onDelete,
  onDuplicate,
  dark,
}: {
  open: boolean;
  compact?: boolean;
  site: Site;
  onToggle: () => void;
  onOpen: (s: Site) => void;
  onCopy: (s: Site) => void;
  onInfo: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  dark?: boolean;
}) {
  const run = (action: any, arg?: any) => {
    action(arg);
    onToggle();
  };

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          "grid place-items-center rounded-lg bg-transparent text-slate-500 transition hover:bg-black/5 hover:text-slate-800",
          compact ? "h-7 w-7 text-sm" : "h-8 w-8 text-base",
          dark && "text-slate-300 hover:bg-white/10 hover:text-white",
        )}
      >
        ⋮
      </button>

      {open && (
        <>
          <div
            className={cn(
              "absolute right-0 top-full z-30 mt-1 hidden w-40 rounded-2xl border p-1 shadow-xl backdrop-blur-2xl md:block",
              dark ? "border-slate-700 bg-slate-900/96 text-slate-100" : "border-white/70 bg-white/96",
            )}
          >
            <MenuAction onClick={() => run(onOpen, site)} dark={dark}>Open</MenuAction>
            <MenuAction onClick={() => run(onCopy, site)} dark={dark}>Copy URL</MenuAction>
            <MenuAction onClick={() => run(onInfo, site.id)} dark={dark}>Information</MenuAction>
            <MenuAction onClick={() => run(onEdit, site.id)} dark={dark}>Tile settings</MenuAction>
            {onDuplicate && <MenuAction onClick={() => run(onDuplicate, site.id)} dark={dark}>Duplicate</MenuAction>}
            <MenuAction onClick={() => run(onDelete, site.id)} danger dark={dark}>Delete</MenuAction>
          </div>

          <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onToggle} />
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t p-3 pb-6 backdrop-blur-2xl md:hidden",
              dark ? "border-slate-700 bg-slate-900/98 text-slate-100" : "border-white/80 bg-white/96",
            )}
          >
            <div className={cn("mx-auto mb-2 h-1 w-10 rounded-full", dark ? "bg-slate-700" : "bg-slate-300")} />
            <MenuAction mobile onClick={() => run(onOpen, site)} dark={dark}>Open</MenuAction>
            <MenuAction mobile onClick={() => run(onCopy, site)} dark={dark}>Copy URL</MenuAction>
            <MenuAction mobile onClick={() => run(onInfo, site.id)} dark={dark}>Information</MenuAction>
            <MenuAction mobile onClick={() => run(onEdit, site.id)} dark={dark}>Tile settings</MenuAction>
            {onDuplicate && <MenuAction mobile onClick={() => run(onDuplicate, site.id)} dark={dark}>Duplicate</MenuAction>}
            <MenuAction mobile onClick={() => run(onDelete, site.id)} danger dark={dark}>Delete</MenuAction>
          </div>
        </>
      )}
    </div>
  );
}

function MenuAction({
  children,
  onClick,
  danger,
  mobile,
  dark,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  mobile?: boolean;
  dark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg px-3 text-left transition",
        mobile ? "py-2.5 text-sm" : "py-1.5 text-xs",
        danger
          ? dark
            ? "text-rose-400 hover:bg-rose-950/25"
            : "text-rose-600 hover:bg-rose-50"
          : dark
            ? "hover:bg-white/10"
            : "hover:bg-slate-100",
      )}
    >
      {children}
    </button>
  );
}
