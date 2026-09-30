import { cn } from "../../utils/cn";

export function Toggle({ checked, onChange, className }: { checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "toggle-track",
        checked ? "bg-accent" : "bg-slate-300",
        className,
      )}
      aria-pressed={checked}
    >
      <span className={cn("toggle-thumb", checked && "translate-x-[18px]")} />
    </button>
  );
}
