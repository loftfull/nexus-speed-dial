export interface Session {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  siteIds: string[];
  createdAt: string;
  updatedAt: string;
  isOpened: boolean;
  autoOpen?: boolean; // Автоматически открывать при старте
}

export interface SessionView {
  view: "cards" | "icons" | "list" | "table";
  columns: 2 | 3 | 4 | 5;
  showScreenshot: boolean;
}

export interface SessionFilters {
  project?: string;
  category?: string;
  group?: string;
  tags?: string[];
}

export interface SessionSettings {
  view: SessionView;
  filters: SessionFilters;
  autoOpenTabs: boolean; // Автоматически открывать вкладки
  maxTabs: number; // Максимум вкладок (для защиты браузера)
}
