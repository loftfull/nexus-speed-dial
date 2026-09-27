import { Site } from "../types";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const host = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

export const hostOf = host;

export const toSite = (site: any, index: number): Site => ({
  ...site,
  order: typeof site.order === "number" ? site.order : index + 1,
});

export const unique = (a: string[]) => Array.from(new Set(a));

export const faviconUrl = (site: Site) =>
  site.icon || `https://www.google.com/s2/favicons?domain=${host(site.url)}&sz=128`;

export const screenshotUrl = (site: Site) =>
  site.screenshot || `https://image.thum.io/get/width/800/crop/640/noanimate/${site.url}`;

export function useBaseDraft(project: string, category: string, group: string) {
  return {
    title: "",
    url: "",
    description: "",
    longDescription: "",
    project: project !== "All projects" ? project : "",
    category: category !== "All categories" ? category : "",
    group: group !== "All groups" ? group : "",
    tags: "",
    icon: "",
    screenshot: "",
  };
}
