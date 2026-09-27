import { ReactNode } from "react";
import { cn } from "../../utils/cn";

export function Modal({ children, onClose, dark }: { children: ReactNode; onClose: () => void; dark?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={cn("w-full max-w-xl rounded-3xl border p-5 shadow-2xl backdrop-blur-2xl", dark ? "border-slate-700 bg-slate-900/92 text-slate-100" : "border-white/70 bg-white/94")}>
        {children}
      </div>
    </div>
  );
}
