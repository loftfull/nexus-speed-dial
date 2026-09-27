export type Site = {
  id: string;
  title: string;
  url: string;
  description: string;
  longDescription?: string;
  project: string;
  category: string;
  group: string;
  tags: string[];
  icon?: string;
  screenshot?: string;
  extractedAt?: string;
  favorite: boolean;
  visits: number;
  order: number;
};

export type Mode = "all" | "favorites" | "recent" | "tag" | "dashboard";
export type ViewMode = "cards" | "icons" | "list" | "table";
export type SortMode = "manual" | "alphabetical" | "mostVisited";
export type ThemeProfile = "macLight" | "macNight" | "autoContrast";
export type Density = "comfortable" | "compact";

export type SmartCollection = {
  id: string;
  name: string;
  emoji: string;
  rules: {
    tags?: string[];
    project?: string;
    onlyFavorites?: boolean;
    onlyAiEnriched?: boolean;
    minVisits?: number;
  };
};

export type Prefs = {
  view: ViewMode;
  columns: 2 | 3 | 4 | 5;
  iconSize: number;
  showScreenshot: boolean;
  sort: SortMode;
  theme: ThemeProfile;
  density: Density;
  floatingCards: boolean;
  focusMode: boolean;
  automotiveMode: boolean;
  showDock: boolean;
};
