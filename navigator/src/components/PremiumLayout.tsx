import { ReactNode } from "react";
import { cn } from "../utils/cn";

export function PremiumCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-[28px] border border-white/60 bg-white/85 backdrop-blur-3xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.12)]",
      className
    )}>
      {children}
    </div>
  );
}

export function PremiumButton({ 
  children, 
  variant = "primary", 
  size = "md",
  className,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  
  const variants = {
    primary: "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/25 hover:-translate-y-0.5",
    secondary: "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow-md",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
  };
  
  const sizes = {
    sm: "px-3.5 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function PremiumSection({ 
  title, 
  children, 
  className 
}: { 
  title: string; 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="px-1">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          {title}
        </h3>
      </div>
      <div className="space-y-1.5">
        {children}
      </div>
    </section>
  );
}

export function PremiumBadge({ 
  children, 
  variant = "default",
  className 
}: { 
  children: ReactNode; 
  variant?: "default" | "active" | "neutral";
  className?: string;
}) {
  const variants = {
    default: "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
    active: "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/15",
    neutral: "bg-slate-100 text-slate-500 border-slate-200",
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded-xl border px-4 py-1.5 text-xs font-medium transition-all duration-200",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}

export function PremiumDivider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />;
}
