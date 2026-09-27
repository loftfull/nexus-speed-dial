import { ReactNode } from "react";
import { cn } from "../utils/cn";
import { Toggle } from "./ui/Toggle";

export function SettingsSection({ title, children, icon }: { title: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[22px] border border-white/60 bg-white/72 p-4 backdrop-blur-2xl shadow-float dark:border-slate-700/60 dark:bg-slate-900/72">
      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-100">
        {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function SettingRow({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-100">{label}</p>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <Toggle checked={checked} onChange={onChange} />;
}

export function SettingSelect({ value, onChange, options }: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 min-w-[132px] rounded-xl border border-slate-200/80 bg-white/90 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function SettingInput({ value, onChange, placeholder, type = "text", label }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
      />
    </div>
  );
}

export function SettingButton({ children, variant = "primary", onClick, disabled }: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20",
    secondary: "bg-white/90 text-slate-700 border border-slate-200/80 hover:bg-white dark:bg-slate-900/90 dark:text-slate-100 dark:border-slate-700",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-10 rounded-xl px-4 text-sm font-semibold transition-all duration-200",
        variants[variant],
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {children}
    </button>
  );
}
