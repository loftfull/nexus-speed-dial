import { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Button({ children, variant = "outline", loading, dark, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "outline" | "primary"; loading?: boolean; dark?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={cn(
        "flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition",
        variant === "primary" ? "bg-accent text-white hover:bg-accent-hover" : dark ? "border border-slate-700 hover:bg-white/10" : "border border-slate-200 hover:bg-slate-50",
        (loading || props.disabled) && "opacity-50 pointer-events-none",
        className
      )}
    >
      {loading ? "..." : children}
    </button>
  );
}
