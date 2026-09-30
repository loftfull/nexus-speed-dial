import { InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Input(props: InputHTMLAttributes<HTMLInputElement> & { dark?: boolean }) {
  const { className, dark, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "h-10 w-full rounded-xl border px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft",
        dark ? "border-slate-700 bg-slate-900/80 text-slate-100" : "border-slate-200 bg-white",
        className,
      )}
    />
  );
}
