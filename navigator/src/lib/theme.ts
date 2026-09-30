/**
 * Colour tokens. Values here are the single source of truth: `applyTheme` writes them to CSS
 * variables, Tailwind utilities (`text-muted`, `bg-accent`, …) read those variables, and the
 * unit tests check WCAG 2.x contrast ratios for every text/background pair.
 */
import type { Accent, ThemeProfile } from "../types";

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

/** WCAG 2.x relative luminance. */
export function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.x contrast ratio, 1–21. */
export function contrast(a: string | Rgb, b: string | Rgb): number {
  const la = luminance(typeof a === "string" ? hexToRgb(a) : a);
  const lb = luminance(typeof b === "string" ? hexToRgb(b) : b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Alpha-composites `fg` (with `alpha`) over an opaque `bg`. */
export function blend(fg: string, alpha: number, bg: string): Rgb {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  return f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha))) as Rgb;
}

export type Palette = {
  /** Page background. */
  canvas: string;
  /** Most translucent glass surface (cards) and its opacity over the canvas. */
  surface: string;
  surfaceAlpha: number;
  fg: string;
  /** Secondary text: descriptions, domains, labels. */
  muted: string;
  /** Tertiary text: counters, hints, shortcut digits. Still AA for small text. */
  subtle: string;
  /** Favourite star (non-text graphic, WCAG 1.4.11 requires 3:1). */
  star: string;
};

export const palettes: Record<ThemeProfile, Palette> = {
  macLight: { canvas: "#f0f2f8", surface: "#ffffff", surfaceAlpha: 0.55, fg: "#0f172a", muted: "#475569", subtle: "#5b6b82", star: "#c26100" },
  autoContrast: { canvas: "#ffffff", surface: "#ffffff", surfaceAlpha: 1, fg: "#020617", muted: "#1e293b", subtle: "#334155", star: "#9a4d00" },
  macNight: { canvas: "#0c0d18", surface: "#0f0f19", surfaceAlpha: 0.8, fg: "#f1f5f9", muted: "#cbd5e1", subtle: "#94a3b8", star: "#fbbf24" },
};

export type AccentTokens = {
  label: string;
  /** Buttons, active chips; white text sits on it. */
  base: string;
  /** Hover state and accent-coloured text on light surfaces. */
  strong: string;
  /** Tinted backgrounds (selected template, active nav). */
  soft: string;
  /** Accent-coloured text on the night theme. */
  onDark: string;
};

export const accents: Record<Accent, AccentTokens> = {
  blue: { label: "Blue", base: "#2563eb", strong: "#1d4ed8", soft: "#dbeafe", onDark: "#93c5fd" },
  indigo: { label: "Indigo", base: "#4f46e5", strong: "#4338ca", soft: "#e0e7ff", onDark: "#a5b4fc" },
  violet: { label: "Violet", base: "#7c3aed", strong: "#6d28d9", soft: "#ede9fe", onDark: "#c4b5fd" },
  teal: { label: "Teal", base: "#0f766e", strong: "#115e59", soft: "#ccfbf1", onDark: "#5eead4" },
  rose: { label: "Rose", base: "#e11d48", strong: "#be123c", soft: "#ffe4e6", onDark: "#fda4af" },
  amber: { label: "Amber", base: "#b45309", strong: "#92400e", soft: "#fef3c7", onDark: "#fcd34d" },
};

export const ON_ACCENT = "#ffffff";

/** Effective card background for contrast purposes (glass over the canvas). */
export const cardBackground = (p: Palette): Rgb => blend(p.surface, p.surfaceAlpha, p.canvas);

export function themeVariables(theme: ThemeProfile, accent: Accent): Record<string, string> {
  const p = palettes[theme];
  const a = accents[accent];
  const dark = theme === "macNight";
  return {
    "--nx-canvas": p.canvas,
    "--nx-fg": p.fg,
    "--nx-muted": p.muted,
    "--nx-subtle": p.subtle,
    "--nx-star": p.star,
    "--nx-accent": a.base,
    "--nx-accent-hover": a.strong,
    "--nx-accent-text": dark ? a.onDark : a.strong,
    "--nx-accent-soft": dark ? `${a.base}33` : a.soft,
    "--nx-on-accent": ON_ACCENT,
  };
}

export function applyTheme(root: HTMLElement, theme: ThemeProfile, accent: Accent) {
  for (const [k, v] of Object.entries(themeVariables(theme, accent))) root.style.setProperty(k, v);
}

/** Stable per-domain hue so letter fallbacks are distinguishable without network access. */
export function domainHue(domain: string): number {
  let h = 0;
  for (let i = 0; i < domain.length; i++) h = (h * 31 + domain.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as Rgb;
}

/** Colours for the letter tile; lightness values were chosen so every hue passes 4.5:1. */
export const monogramColors = (hue: number) => ({
  background: `hsl(${hue} 70% 92%)`,
  color: `hsl(${hue} 60% 28%)`,
  bgRgb: hslToRgb(hue, 70, 92),
  fgRgb: hslToRgb(hue, 60, 28),
});
