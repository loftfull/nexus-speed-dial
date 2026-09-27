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
  /** Set only when metadata/AI enrichment actually filled the site. */
  extractedAt?: string;
  favorite: boolean;
  visits: number;
  /** ISO timestamp of the last open; drives the "Recent" view. */
  lastVisitedAt?: string;
  order: number;
};

export type SiteDraft = Omit<Site, "id" | "favorite" | "visits" | "order" | "lastVisitedAt">;

export type Mode = "all" | "favorites" | "recent";
export type ViewMode = "cards" | "icons" | "list";
export type SortMode = "manual" | "alphabetical" | "mostVisited";
export type ThemeProfile = "macLight" | "macNight" | "autoContrast";
export type Density = "comfortable" | "compact";

export type CollectionRules = {
  tags?: string[];
  project?: string;
  onlyFavorites?: boolean;
  onlyAiEnriched?: boolean;
  minVisits?: number;
};

export type SmartCollection = {
  id: string;
  name: string;
  rules: CollectionRules;
};

export type Session = {
  id: string;
  name: string;
  siteIds: string[];
  createdAt: string;
};

export type Prefs = {
  view: ViewMode;
  columns: 2 | 3 | 4 | 5;
  iconSize: number;
  showScreenshot: boolean;
  sort: SortMode;
  theme: ThemeProfile;
  density: Density;
  focusMode: boolean;
  showDock: boolean;
};

export type LibraryData = {
  sites: Site[];
  prefs: Prefs;
  sessions: Session[];
  collections: SmartCollection[];
};
