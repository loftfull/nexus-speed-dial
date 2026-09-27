import type { Site } from "../types";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

export const unique = (a: string[]) => Array.from(new Set(a));

export const googleFavicon = (url: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=128`;

export const faviconUrl = (site: Site) => site.icon || googleFavicon(site.url);

export const thumioUrl = (url: string) => `https://image.thum.io/get/width/800/crop/640/noanimate/${url}`;

export const screenshotUrl = (site: Site) => site.screenshot || thumioUrl(site.url);

export const isEditableTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);
};
