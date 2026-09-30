import { ReactNode, useEffect } from "react";
import { cn } from "../../utils/cn";

export function Drawer({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <aside role="dialog" aria-modal="true" aria-label={title} className={cn(
        "fixed right-0 top-0 z-[70] flex h-full w-full max-w-[380px] flex-col",
        "glass shadow-2xl border-l border-white/40 animate-slide-right"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/6 px-5 py-4">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/6 text-muted hover:bg-black/10 hover:text-slate-700 transition text-lg"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">
          {children}
        </div>
      </aside>
    </>
  );
}

export function Toast({
  message,
  onUndo,
}: {
  message: string | null;
  /** Only passed for reversible actions (deletions). */
  onUndo?: () => void;
}) {
  if (!message) return null;

  return (
    <div role="status" aria-live="polite" className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 animate-fade-up">
      <div className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-3",
        "bg-slate-900/92 text-white backdrop-blur-xl shadow-2xl",
        "border border-white/8"
      )}>
        <span className="text-[13px] font-medium">{message}</span>
        {onUndo && (
          <button
            onClick={onUndo}
            className="text-[12px] font-bold text-blue-400 hover:text-blue-300 transition"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
