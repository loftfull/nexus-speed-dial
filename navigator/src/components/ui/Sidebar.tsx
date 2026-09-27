import { ReactNode } from "react";
import { cn } from "../../utils/cn";

export function SidebarSection({ label, children, icon }: { label: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <section className="space-y-0.5">
      <div className="flex items-center gap-2 px-3 py-1 mb-1">
        {icon && <span className="text-slate-400 opacity-70">{icon}</span>}
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
      </div>
      <div className="space-y-0.5">
        {children}
      </div>
    </section>
  );
}

export function SidebarButton({
  children,
  active,
  count,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex h-9 w-full items-center justify-between rounded-xl px-3 text-[13px] transition-all duration-200",
        active
          ? "nav-active"
          : "font-medium text-slate-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5"
      )}
    >
      <span className="truncate">{children}</span>
      {count !== undefined && (
        <span className={cn(
          "ml-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold transition-colors",
          active
            ? "bg-blue-500/12 text-blue-600 dark:bg-white/10 dark:text-white"
            : "bg-black/6 text-slate-500 group-hover:bg-black/8 dark:bg-white/5 dark:text-slate-400"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
