import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "./utils/cn";
import type { LibraryData, Mode, Prefs, Site, SiteDraft, SmartCollection } from "./types";
import { siteTemplates } from "./data/siteTemplates";

/* Components */
import { Icons } from "./components/ui/Icons";
import { SidebarSection, SidebarButton } from "./components/ui/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import { SiteCard, SiteIcon, type SiteActions, type ThemeClasses } from "./components/SiteCard";
import { SiteEditor } from "./components/SiteEditor";
import { Toast, Drawer } from "./components/ui/Drawer";
import { Toggle } from "./components/ui/Toggle";
import { SettingsSection, SettingRow, SettingSelect, SettingButton } from "./components/Settings";

/* Logic */
import { hostOf, isEditableTarget, uid, unique } from "./utils/helpers";
import { ALL_CATEGORIES, ALL_GROUPS, ALL_PROJECTS, filterSites, matchesCollection, reorder, searchSites } from "./lib/filter";
import { defaultCollections, defaultPrefs, normalizeOrder, parseLibrary, serializeLibrary } from "./lib/schema";
import { loadAiKey, loadBackup, loadLibrary, saveAiKey, saveBackup, saveLibrary } from "./lib/storage";
import { fetchMetadata } from "./lib/enrich";

const PAGE_SIZE = 50;

const seedSites: Site[] = [
  { id: "s1", title: "GitHub", url: "https://github.com", description: "Source code hosting", project: "Work", category: "Engineering", group: "Frontend", tags: ["dev", "git"], favorite: true, visits: 20, order: 1 },
  { id: "s2", title: "Figma", url: "https://figma.com", description: "Collaborative design tool", project: "Work", category: "Design", group: "Tools", tags: ["design", "ui"], favorite: true, visits: 15, order: 2 },
  { id: "s3", title: "Notion", url: "https://notion.so", description: "Notes and planning workspace", project: "Work", category: "Productivity", group: "Planning", tags: ["notes", "wiki"], favorite: true, visits: 12, order: 3 },
  { id: "s4", title: "YouTube", url: "https://youtube.com", description: "Video learning platform", project: "Personal", category: "Learning", group: "Video", tags: ["video", "learning"], favorite: false, visits: 18, order: 4 },
  { id: "s5", title: "Booking", url: "https://booking.com", description: "Hotels and apartments", project: "Personal", category: "Travel", group: "Hotels", tags: ["travel", "hotel"], favorite: false, visits: 8, order: 5 },
  { id: "s6", title: "Vite", url: "https://vite.dev", description: "Next generation build tool", project: "Work", category: "Engineering", group: "Frontend", tags: ["dev", "build"], favorite: false, visits: 10, order: 6 },
  { id: "s7", title: "Tailwind CSS", url: "https://tailwindcss.com", description: "Utility-first CSS framework", project: "Work", category: "Engineering", group: "Frontend", tags: ["css", "dev"], favorite: true, visits: 14, order: 7 },
  { id: "s8", title: "Dribbble", url: "https://dribbble.com", description: "Design inspiration community", project: "Work", category: "Design", group: "Inspiration", tags: ["design", "inspiration"], favorite: false, visits: 6, order: 8 },
];

type Deleted = { site: Site; index: number }[];
type ToastState = { message: string; undo?: Deleted } | null;

function initialLibrary(): { data: LibraryData; migrated: boolean } {
  const loaded = typeof localStorage !== "undefined" ? loadLibrary(localStorage) : null;
  return loaded ?? { data: { sites: seedSites, prefs: defaultPrefs, sessions: [], collections: defaultCollections }, migrated: false };
}

export default function App() {
  const [boot] = useState(initialLibrary);
  const [sites, setSites] = useState<Site[]>(boot.data.sites);
  const [prefs, setPrefs] = useState<Prefs>(boot.data.prefs);
  const [sessions, setSessions] = useState(boot.data.sessions);
  const [collections, setCollections] = useState<SmartCollection[]>(boot.data.collections);
  const [aiApiKey, setAiApiKey] = useState(() => loadAiKey(localStorage));

  const [mode, setMode] = useState<Mode>("all");
  const [project, setProject] = useState(ALL_PROJECTS);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [group, setGroup] = useState(ALL_GROUPS);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(1);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editor, setEditor] = useState<{ siteId: string | null } | null>(null);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [collectionEditorOpen, setCollectionEditorOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isOverlayOpen = sidebarOpen || !!editor || !!infoId || commandOpen || settingsOpen || collectionEditorOpen || templatesOpen || moveOpen;

  const showToast = useCallback((message: string, undo?: Deleted) => {
    clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 6000 : 3500);
  }, []);

  useEffect(() => {
    if (boot.migrated) showToast("Library migrated from Navigator 2.0 storage");
  }, [boot.migrated, showToast]);

  useEffect(() => {
    document.body.style.overflow = isOverlayOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOverlayOpen]);

  /* Theme: `.dark` enables Tailwind dark: variants, `.contrast` the high-contrast profile */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", prefs.theme === "macNight");
    root.classList.toggle("contrast", prefs.theme === "autoContrast");
    root.style.colorScheme = prefs.theme === "macNight" ? "dark" : "light";
  }, [prefs.theme]);

  /* Persistence */
  const library = useMemo<LibraryData>(() => ({ sites, prefs, sessions, collections }), [sites, prefs, sessions, collections]);
  const storageWarned = useRef(false);
  useEffect(() => {
    if (!saveLibrary(localStorage, library) && !storageWarned.current) {
      storageWarned.current = true;
      showToast("Could not save — browser storage is full or disabled. Export a backup.");
    }
  }, [library, showToast]);
  useEffect(() => saveAiKey(localStorage, aiApiKey), [aiApiKey]);
  useEffect(() => {
    const t = setTimeout(() => { if (sites.length) saveBackup(localStorage, library); }, 2000);
    return () => clearTimeout(t);
  }, [library, sites.length]);

  /* Derived data */
  const activeCollection = collections.find((c) => c.id === activeCollectionId) ?? null;
  const visibleSites = useMemo(
    () => filterSites(sites, { mode, project, category, group, tag: activeTag, collection: activeCollection?.rules ?? null, sort: prefs.sort }),
    [sites, mode, project, category, group, activeTag, activeCollection, prefs.sort],
  );
  const pagedSites = visibleSites.slice(0, pageCount * PAGE_SIZE);
  useEffect(() => setPageCount(1), [mode, project, category, group, activeTag, activeCollectionId]);

  const pinnedSites = useMemo(() => sites.filter((s) => s.favorite).sort((a, b) => b.visits - a.visits).slice(0, 8), [sites]);
  const favoritesCount = useMemo(() => sites.filter((s) => s.favorite).length, [sites]);
  const recentCount = useMemo(() => sites.filter((s) => s.lastVisitedAt || s.visits > 0).length, [sites]);
  const projects = useMemo(() => [ALL_PROJECTS, ...unique(sites.map((s) => s.project))], [sites]);
  const categories = useMemo(() => (project === ALL_PROJECTS ? [] : unique(sites.filter((s) => s.project === project).map((s) => s.category))), [project, sites]);
  const groups = useMemo(
    () => (project === ALL_PROJECTS || category === ALL_CATEGORIES ? [] : unique(sites.filter((s) => s.project === project && s.category === category).map((s) => s.group))),
    [project, category, sites],
  );
  const allTags = useMemo(() => {
    const counts: Record<string, number> = {};
    sites.forEach((s) => s.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 16);
  }, [sites]);
  const paletteResults = useMemo(() => searchSites(sites, commandQuery), [sites, commandQuery]);
  const manualDnD = prefs.sort === "manual" && mode !== "recent" && !selectionMode;
  const filtersActive = project !== ALL_PROJECTS || category !== ALL_CATEGORIES || group !== ALL_GROUPS || mode !== "all" || !!activeTag || !!activeCollectionId;

  const theme: ThemeClasses & { shell: string; panel: string } = useMemo(() => {
    if (prefs.theme === "macNight") return { shell: "text-slate-100", panel: "glass-dark shadow-panel", card: "glass-dark card-lift", subtle: "text-slate-400", isDark: true };
    if (prefs.theme === "autoContrast") return { shell: "text-slate-950", panel: "glass shadow-panel", card: "glass card-lift shadow-float", subtle: "text-slate-600", isDark: false };
    return { shell: "text-slate-900", panel: "glass shadow-panel", card: "glass-subtle card-lift shadow-float", subtle: "text-slate-400", isDark: false };
  }, [prefs.theme]);

  /* Site actions */
  const openSite = useCallback((site: Site) => {
    const now = new Date().toISOString();
    setSites((prev) => prev.map((s) => (s.id === site.id ? { ...s, visits: s.visits + 1, lastVisitedAt: now } : s)));
    window.open(site.url, "_blank", "noopener,noreferrer");
  }, []);

  /**
   * Opens several sites from one user gesture. Pop-up blockers may let only the first tab through,
   * and with "noopener" `window.open` returns null even on success, so blocked tabs cannot be
   * counted — the toast tells the user what to do instead.
   */
  const openMany = useCallback((list: Site[]) => {
    if (!list.length) return;
    const now = new Date().toISOString();
    const ids = new Set(list.map((s) => s.id));
    setSites((prev) => prev.map((s) => (ids.has(s.id) ? { ...s, visits: s.visits + 1, lastVisitedAt: now } : s)));
    list.forEach((s) => window.open(s.url, "_blank", "noopener,noreferrer"));
    showToast(list.length > 1 ? `Opening ${list.length} sites — allow pop-ups for this page if only one opens` : `Opening ${list[0].title}`);
  }, [showToast]);

  const copySiteUrl = useCallback(async (site: Site) => {
    try {
      await navigator.clipboard.writeText(site.url);
      showToast("URL copied");
    } catch {
      showToast("Clipboard is not available");
    }
  }, [showToast]);

  const toggleFavorite = useCallback((id: string) => {
    setSites((prev) => prev.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s)));
  }, []);

  const deleteSites = useCallback((ids: Set<string>) => {
    const removed: Deleted = [];
    sites.forEach((s, index) => { if (ids.has(s.id)) removed.push({ site: s, index }); });
    if (!removed.length) return;
    setSites((prev) => prev.filter((s) => !ids.has(s.id)));
    setSessions((prev) => prev.map((ss) => ({ ...ss, siteIds: ss.siteIds.filter((id) => !ids.has(id)) })));
    showToast(removed.length === 1 ? `Deleted ${removed[0].site.title}` : `Deleted ${removed.length} sites`, removed);
  }, [sites, showToast]);

  const undoDelete = (removed: Deleted) => {
    setSites((prev) => {
      const next = [...prev];
      removed.forEach(({ site, index }) => next.splice(Math.min(index, next.length), 0, site));
      return normalizeOrder(next.map((s, i) => ({ ...s, order: i + 1 })));
    });
    clearTimeout(toastTimer.current);
    setToast(null);
  };

  const duplicateSite = useCallback((id: string) => {
    setSites((prev) => {
      const src = prev.find((s) => s.id === id);
      if (!src) return prev;
      const copy: Site = { ...src, id: uid(), title: `${src.title} (copy)`, visits: 0, lastVisitedAt: undefined, favorite: false, order: src.order + 0.5 };
      return normalizeOrder([...prev, copy]);
    });
  }, []);

  const saveDraft = (draft: SiteDraft) => {
    const editingId = editor?.siteId;
    if (editingId) {
      setSites((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...draft } : s)));
      showToast("Site updated");
    } else {
      const site: Site = { ...draft, id: uid(), favorite: false, visits: 0, order: 0 };
      setSites((prev) => normalizeOrder([site, ...prev]));
      showToast(`Added ${site.title}`);
    }
  };

  const actions: SiteActions = {
    onOpen: openSite,
    onCopy: copySiteUrl,
    onInfo: setInfoId,
    onEdit: (id) => setEditor({ siteId: id }),
    onDelete: (id) => { deleteSites(new Set([id])); setMenuId(null); },
    onDuplicate: duplicateSite,
    onToggleFavorite: toggleFavorite,
  };

  /* Sessions */
  const saveCurrentAsSession = () => {
    const name = window.prompt("Session name:")?.trim();
    if (!name) return;
    setSessions((prev) => [...prev, { id: uid(), name, siteIds: visibleSites.map((s) => s.id), createdAt: new Date().toISOString() }]);
    showToast(`Session "${name}" saved with ${visibleSites.length} sites`);
  };

  /* Import / export */
  const applyLibrary = (data: LibraryData) => {
    setSites(data.sites);
    setPrefs(data.prefs);
    setSessions(data.sessions);
    setCollections(data.collections);
    setActiveCollectionId(null);
    setActiveTag(null);
  };

  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-importing the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let json: unknown;
      try {
        json = JSON.parse(String(reader.result));
      } catch {
        showToast("Import failed: file is not valid JSON");
        return;
      }
      const result = parseLibrary(json);
      if (!result.ok) {
        showToast(`Import failed: ${result.error}`);
        return;
      }
      if (!window.confirm(`Replace your library (${sites.length} sites) with ${result.data.sites.length} imported sites?`)) return;
      saveBackup(localStorage, library);
      applyLibrary(result.data);
      showToast(`Imported ${result.data.sites.length} sites${result.skipped ? `, skipped ${result.skipped} invalid` : ""}`);
    };
    reader.readAsText(file);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(serializeLibrary(library), null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `nexus-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 0);
    showToast("Exported successfully");
  };

  const restoreBackup = () => {
    const backup = loadBackup(localStorage);
    if (!backup) { showToast("No backup found"); return; }
    const when = backup.exportedAt ? new Date(backup.exportedAt).toLocaleString() : "unknown time";
    if (!window.confirm(`Restore ${backup.data.sites.length} sites from backup (${when})?`)) return;
    applyLibrary(backup.data);
    showToast(`Restored from ${when}`);
  };

  /* Bulk actions */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const bulkFavorite = (val: boolean) => {
    setSites((prev) => prev.map((s) => (selectedIds.has(s.id) ? { ...s, favorite: val } : s)));
    showToast(`${val ? "Favorited" : "Unfavorited"} ${selectedIds.size} sites`);
    clearSelection();
  };
  const bulkMove = (target: { project: string; category: string; group: string }) => {
    setSites((prev) => prev.map((s) => (selectedIds.has(s.id)
      ? { ...s, project: target.project.trim() || s.project, category: target.category.trim() || s.category, group: target.group.trim() || s.group }
      : s)));
    showToast(`Moved ${selectedIds.size} sites`);
    setMoveOpen(false);
    clearSelection();
  };

  const selectedInfo = useMemo(() => sites.find((s) => s.id === infoId) || null, [infoId, sites]);
  const editingSite = editor?.siteId ? sites.find((s) => s.id === editor.siteId) ?? null : null;

  const pasteFromClipboard = async () => {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      showToast("Clipboard access was denied");
      return;
    }
    const match = text.match(/https?:\/\/[^\s]+|www\.[^\s]+/);
    if (!match) { showToast("No URL found in clipboard"); return; }
    const url = match[0].startsWith("http") ? match[0] : `https://${match[0]}`;
    if (sites.some((s) => s.url === url)) { showToast("This URL is already in your library"); return; }
    showToast("Fetching site data…");
    let meta: Awaited<ReturnType<typeof fetchMetadata>> | null = null;
    try { meta = await fetchMetadata(url); } catch { /* keep a bare site */ }
    const site: Site = {
      id: uid(),
      title: meta?.title || hostOf(url),
      url,
      description: meta?.description || "",
      project: project !== ALL_PROJECTS ? project : "General",
      category: category !== ALL_CATEGORIES ? category : meta?.publisher || "General",
      group: group !== ALL_GROUPS ? group : "General",
      tags: [],
      icon: meta?.icon,
      screenshot: meta?.screenshot,
      extractedAt: meta ? new Date().toISOString() : undefined,
      favorite: false,
      visits: 0,
      order: 0,
    };
    setSites((prev) => normalizeOrder([site, ...prev]));
    showToast(meta ? `Added ${site.title}` : `Added ${site.title} (metadata unavailable)`);
  };

  const resetFilters = () => {
    setProject(ALL_PROJECTS); setCategory(ALL_CATEGORIES); setGroup(ALL_GROUPS);
    setMode("all"); setActiveTag(null); setActiveCollectionId(null);
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setCommandOpen((v) => !v); return; }
      if (mod && e.key === ",") { e.preventDefault(); setSettingsOpen(true); return; }
      if (e.key === "Escape") {
        setSidebarOpen(false); setSettingsOpen(false); setEditor(null); setInfoId(null); setMenuId(null);
        setCommandOpen(false); setCollectionEditorOpen(false); setTemplatesOpen(false); setMoveOpen(false);
        return;
      }
      if (/^[1-9]$/.test(e.key) && !mod && !e.altKey && !isOverlayOpen && !isEditableTarget(e.target)) {
        const picked = pagedSites[Number(e.key) - 1];
        if (picked) openSite(picked);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pagedSites, openSite, isOverlayOpen]);

  const closeSidebar = () => setSidebarOpen(false);
  const pill = "h-9 rounded-xl border border-black/5 bg-white/50 px-3 text-xs font-semibold transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10";

  return (
    <div className={cn("min-h-dvh transition-colors duration-500", theme.shell)}>
      <div
        className={cn("fixed inset-0 z-40 transition-all duration-300 lg:hidden", sidebarOpen ? "bg-black/30 opacity-100 backdrop-blur-sm" : "pointer-events-none opacity-0")}
        onClick={closeSidebar}
      />

      <div className={cn("min-h-dvh", !prefs.focusMode && "lg:grid lg:grid-cols-[264px_1fr]")}>
        {!prefs.focusMode && (
          <aside
            aria-label="Library navigation"
            className={cn(
              "fixed left-0 top-0 z-50 flex h-dvh w-[264px] flex-col p-4 transition-transform duration-300 ease-out",
              "lg:sticky lg:h-screen lg:translate-x-0 lg:border-r lg:border-white/40",
              theme.panel,
              sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
            )}
          >
            <div className="mb-6 flex items-center gap-3 px-1 pt-1">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-500/25">N</div>
              <div>
                <p className="text-[13px] font-semibold tracking-tight">Nexus Navigator</p>
                <p className="text-[10px] font-medium text-slate-400">{sites.length} sites</p>
              </div>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto pb-4">
              <SidebarSection label="Library" icon={<Icons.Library />}>
                {(["all", "favorites", "recent"] as const).map((m) => (
                  <SidebarButton key={m} active={mode === m} onClick={() => { setMode(m); closeSidebar(); }} count={m === "all" ? sites.length : m === "favorites" ? favoritesCount : recentCount}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </SidebarButton>
                ))}
              </SidebarSection>

              <SidebarSection label="Projects" icon={<Icons.Projects />}>
                {projects.map((p) => (
                  <SidebarButton key={p} active={project === p} onClick={() => { setProject(p); setCategory(ALL_CATEGORIES); setGroup(ALL_GROUPS); closeSidebar(); }} count={p !== ALL_PROJECTS ? sites.filter((s) => s.project === p).length : undefined}>
                    {p}
                  </SidebarButton>
                ))}
              </SidebarSection>

              {categories.length > 0 && (
                <SidebarSection label="Categories" icon={<Icons.Collections />}>
                  <SidebarButton active={category === ALL_CATEGORIES} onClick={() => { setCategory(ALL_CATEGORIES); setGroup(ALL_GROUPS); closeSidebar(); }}>All categories</SidebarButton>
                  {categories.map((c) => <SidebarButton key={c} active={category === c} onClick={() => { setCategory(c); setGroup(ALL_GROUPS); closeSidebar(); }}>{c}</SidebarButton>)}
                </SidebarSection>
              )}

              {groups.length > 0 && (
                <SidebarSection label="Groups" icon={<Icons.Tags />}>
                  <SidebarButton active={group === ALL_GROUPS} onClick={() => { setGroup(ALL_GROUPS); closeSidebar(); }}>All groups</SidebarButton>
                  {groups.map((g) => <SidebarButton key={g} active={group === g} onClick={() => { setGroup(g); closeSidebar(); }}>{g}</SidebarButton>)}
                </SidebarSection>
              )}

              <SidebarSection label="Smart collections" icon={<Icons.Collections />}>
                {collections.map((c) => (
                  <div key={c.id} className="group flex items-center gap-1">
                    <SidebarButton active={activeCollectionId === c.id} count={sites.filter((s) => matchesCollection(s, c.rules)).length} onClick={() => { setActiveCollectionId(activeCollectionId === c.id ? null : c.id); closeSidebar(); }}>
                      {c.name}
                    </SidebarButton>
                    <button
                      type="button"
                      aria-label={`Delete collection ${c.name}`}
                      onClick={() => { setCollections((prev) => prev.filter((x) => x.id !== c.id)); if (activeCollectionId === c.id) setActiveCollectionId(null); }}
                      className="h-6 w-6 shrink-0 items-center justify-center rounded text-xs text-slate-400 opacity-0 hover:text-rose-500 focus-visible:opacity-100 group-hover:opacity-100"
                    >×</button>
                  </div>
                ))}
                <button type="button" onClick={() => setCollectionEditorOpen(true)} className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-[12px] font-medium text-blue-600 transition hover:bg-blue-50/50 dark:text-blue-400 dark:hover:bg-white/5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/20"><Icons.Plus className="h-3 w-3" /></span>
                  New collection
                </button>
              </SidebarSection>

              {allTags.length > 0 && (
                <SidebarSection label="Tags" icon={<Icons.Tags />}>
                  <div className="flex flex-wrap gap-1 px-1">
                    {allTags.map(([tag, count]) => (
                      <button
                        type="button"
                        key={tag}
                        aria-pressed={activeTag === tag}
                        onClick={() => { setActiveTag(activeTag === tag ? null : tag); closeSidebar(); }}
                        className={cn(
                          "rounded-lg border px-2 py-0.5 text-[10px] font-medium transition",
                          activeTag === tag
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200/50 bg-white/50 text-slate-500 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
                        )}
                      >
                        #{tag} <span className="opacity-60">{count}</span>
                      </button>
                    ))}
                  </div>
                </SidebarSection>
              )}

              {sessions.length > 0 && (
                <SidebarSection label="Sessions" icon={<Icons.TopVisited />}>
                  {sessions.map((s) => (
                    <div key={s.id} className="group flex items-center gap-1">
                      <SidebarButton active={false} onClick={() => openMany(sites.filter((x) => s.siteIds.includes(x.id)))} count={s.siteIds.length}>{s.name}</SidebarButton>
                      <button
                        type="button"
                        aria-label={`Delete session ${s.name}`}
                        onClick={() => { setSessions((prev) => prev.filter((x) => x.id !== s.id)); showToast("Session deleted"); }}
                        className="h-6 w-6 shrink-0 rounded text-xs text-slate-400 opacity-0 hover:text-rose-500 focus-visible:opacity-100 group-hover:opacity-100"
                      >×</button>
                    </div>
                  ))}
                </SidebarSection>
              )}

              <SidebarSection label="Quick access" icon={<Icons.TopVisited />}>
                {pinnedSites.length > 0 ? pinnedSites.slice(0, 5).map((s, i) => (
                  <button type="button" key={s.id} onClick={() => openSite(s)} className="flex h-9 w-full items-center gap-3 rounded-xl px-2.5 text-[13px] text-slate-500 transition hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5">
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold", i === 0 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500")}>{i + 1}</span>
                    <SiteIcon site={s} size={16} className="rounded" />
                    <span className="truncate">{s.title}</span>
                  </button>
                )) : <p className="px-3 text-xs text-slate-400">Star sites to see them here</p>}
              </SidebarSection>

              <div className="space-y-1 pt-4">
                <button type="button" onClick={saveCurrentAsSession} disabled={!visibleSites.length} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-purple-600 transition hover:bg-purple-50/50 disabled:opacity-40 dark:text-purple-400 dark:hover:bg-white/5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm shadow-purple-600/20"><Icons.Plus className="h-3 w-3" /></span>
                  Save view as session
                </button>
                <button type="button" onClick={() => setTemplatesOpen(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-emerald-600 transition hover:bg-emerald-50/50 dark:text-emerald-400 dark:hover:bg-white/5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"><Icons.Plus className="h-3 w-3" /></span>
                  Import templates
                </button>
              </div>
            </nav>
          </aside>
        )}

        <main className="min-w-0 pb-28">
          <header className="sticky top-0 z-30 p-3 md:p-4">
            <div className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 shadow-header animate-fade-in", theme.panel)}>
              {!prefs.focusMode && (
                <button type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-black/5 lg:hidden">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              )}
              <div className="flex flex-1 items-center gap-2 overflow-x-auto text-[11px] font-semibold tracking-[0.08em]">
                <span className="chip chip-blue">{project}</span>
                {category !== ALL_CATEGORIES && <><span className="text-slate-300">/</span><span className="chip">{category}</span></>}
                {group !== ALL_GROUPS && <><span className="text-slate-300">/</span><span className="chip">{group}</span></>}
                {mode !== "all" && <span className="chip">{mode}</span>}
                {activeTag && <span className="chip">#{activeTag}</span>}
                {activeCollection && <span className="chip">{activeCollection.name}</span>}
                {filtersActive && <button type="button" onClick={resetFilters} className="chip hover:bg-black/5">Clear</button>}
                <span className={cn("chip ml-auto", theme.subtle)}>{visibleSites.length} sites</span>
              </div>
              <div className="flex items-center gap-2">
                {!selectionMode && <button type="button" onClick={() => setSelectionMode(true)} className={pill}>Select</button>}
                {selectionMode && (
                  <>
                    <button type="button" onClick={() => setSelectedIds(new Set(visibleSites.map((s) => s.id)))} className={pill}>All</button>
                    {selectedIds.size > 0 && (
                      <>
                        <button type="button" aria-label="Add selected to favorites" onClick={() => bulkFavorite(true)} className={cn(pill, "text-amber-500")}>★</button>
                        <button type="button" aria-label="Remove selected from favorites" onClick={() => bulkFavorite(false)} className={cn(pill, "text-slate-400")}>☆</button>
                        <button type="button" onClick={() => setMoveOpen(true)} className={pill}>Move to…</button>
                        <button type="button" onClick={() => { openMany(sites.filter((s) => selectedIds.has(s.id))); clearSelection(); }} className={pill}>Open {selectedIds.size}</button>
                        <button
                          type="button"
                          onClick={() => { if (window.confirm(`Delete ${selectedIds.size} sites?`)) { deleteSites(selectedIds); clearSelection(); } }}
                          className="h-9 rounded-xl bg-rose-500 px-3 text-xs font-bold text-white shadow-sm"
                        >Delete {selectedIds.size}</button>
                      </>
                    )}
                    <button type="button" onClick={clearSelection} className="h-9 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white shadow-sm">Done</button>
                  </>
                )}

                {!selectionMode && (
                  <>
                    <select aria-label="Sort" value={prefs.sort} onChange={(e) => setPrefs((p) => ({ ...p, sort: e.target.value as Prefs["sort"] }))} className={cn(pill, "hidden cursor-pointer outline-none sm:inline-flex")}>
                      <option value="manual">Manual</option>
                      <option value="alphabetical">A → Z</option>
                      <option value="mostVisited">Most visited</option>
                    </select>
                    <select aria-label="View" value={prefs.view} onChange={(e) => setPrefs((p) => ({ ...p, view: e.target.value as Prefs["view"] }))} className={cn(pill, "hidden cursor-pointer outline-none md:inline-flex")}>
                      <option value="cards">Cards</option>
                      <option value="icons">Icons</option>
                      <option value="list">List</option>
                    </select>
                    <button type="button" onClick={() => setCommandOpen(true)} className={cn(pill, "hidden sm:inline-flex sm:items-center")}>⌘K</button>
                    <button type="button" onClick={pasteFromClipboard} className={cn(pill, "hidden text-emerald-600 sm:inline-flex sm:items-center")}>Paste</button>
                    <button type="button" aria-label="Settings" onClick={() => setSettingsOpen(true)} className={cn(pill, "grid w-9 place-items-center px-0")}><Icons.Settings /></button>
                    <button type="button" onClick={() => setEditor({ siteId: null })} className="h-9 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">+ Add</button>
                  </>
                )}
              </div>
            </div>
          </header>

          <div
            className={cn(
              "grid gap-4 p-3 md:p-5",
              prefs.view === "list" && "gap-2",
              prefs.view === "icons" && "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8",
              prefs.view === "cards" && prefs.columns === 2 && "sm:grid-cols-2",
              prefs.view === "cards" && prefs.columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
              prefs.view === "cards" && prefs.columns === 4 && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              prefs.view === "cards" && prefs.columns === 5 && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
            )}
          >
            {pagedSites.map((site, i) => (
              <div
                key={site.id}
                className={cn("animate-fade-up rounded-3xl", dropTargetId === site.id && draggedId !== site.id && "ring-2 ring-blue-400/70", draggedId === site.id && "opacity-50")}
                style={{ animationDelay: `${Math.min(i * 30, 200)}ms` }}
                draggable={manualDnD}
                onDragStart={() => setDraggedId(site.id)}
                onDragEnd={() => { setDraggedId(null); setDropTargetId(null); }}
                onDragOver={(e) => { if (manualDnD && draggedId) { e.preventDefault(); setDropTargetId(site.id); } }}
                onDrop={() => { if (draggedId) setSites((prev) => reorder(prev, draggedId, site.id)); setDraggedId(null); setDropTargetId(null); }}
              >
                <SiteCard
                  site={site}
                  prefs={prefs}
                  theme={theme}
                  actions={actions}
                  menuOpen={menuId === site.id}
                  onToggleMenu={() => setMenuId(menuId === site.id ? null : site.id)}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(site.id)}
                  onToggleSelection={toggleSelected}
                  hotkey={i < 9 ? i + 1 : undefined}
                />
              </div>
            ))}

            {visibleSites.length > pagedSites.length && (
              <div className="col-span-full flex justify-center py-4">
                <button type="button" onClick={() => setPageCount((n) => n + 1)} className={pill}>
                  Show more ({visibleSites.length - pagedSites.length} left)
                </button>
              </div>
            )}

            {!visibleSites.length && (
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-center animate-fade-up">
                <div className="glass mb-5 flex h-20 w-20 items-center justify-center rounded-3xl shadow-float">
                  <Icons.Collections className="h-10 w-10 text-slate-300" />
                </div>
                {sites.length ? (
                  <>
                    <h3 className="mb-2 text-lg font-semibold tracking-tight">Nothing matches these filters</h3>
                    <p className="mb-6 max-w-xs text-sm leading-relaxed text-slate-400">Try another project, tag or collection.</p>
                    <button type="button" onClick={resetFilters} className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700">Clear filters</button>
                  </>
                ) : (
                  <>
                    <h3 className="mb-2 text-lg font-semibold tracking-tight">Your library is empty</h3>
                    <p className="mb-6 max-w-xs text-sm leading-relaxed text-slate-400">Add sites with + Add, paste a URL from the clipboard, or import a template.</p>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setEditor({ siteId: null })} className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700">+ Add site</button>
                      <button type="button" onClick={() => setTemplatesOpen(true)} className="glass rounded-2xl px-5 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-white">Templates</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedInfo && (
        <Drawer title="Site information" onClose={() => setInfoId(null)}>
          <div className="mb-6 flex items-center gap-4">
            <SiteIcon site={selectedInfo} size={56} className="shadow-sm" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{selectedInfo.title}</p>
              <p className="truncate text-sm text-slate-500">{hostOf(selectedInfo.url)}</p>
            </div>
          </div>
          <div className="space-y-3">
            <InfoBlock label="Path" value={`${selectedInfo.project} / ${selectedInfo.category} / ${selectedInfo.group}`} />
            <InfoBlock label="Description" value={selectedInfo.description || "No description"} />
            {selectedInfo.longDescription && <InfoBlock label="Details" value={selectedInfo.longDescription} />}
            <InfoBlock label="Tags" value={selectedInfo.tags.length ? selectedInfo.tags.join(", ") : "None"} />
            <InfoBlock label="Visits" value={String(selectedInfo.visits)} />
            {selectedInfo.lastVisitedAt && <InfoBlock label="Last opened" value={new Date(selectedInfo.lastVisitedAt).toLocaleString()} />}
            {selectedInfo.extractedAt && <InfoBlock label="Enriched" value={new Date(selectedInfo.extractedAt).toLocaleDateString()} />}
          </div>
          <div className="mt-6 flex gap-2">
            <button type="button" onClick={() => setEditor({ siteId: selectedInfo.id })} className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-white/5">Edit</button>
            <button type="button" onClick={() => copySiteUrl(selectedInfo)} className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-white/5">Copy URL</button>
            <button type="button" onClick={() => { openSite(selectedInfo); setInfoId(null); }} className="h-10 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white">Open</button>
          </div>
        </Drawer>
      )}

      {prefs.showDock && pinnedSites.length > 0 && !isOverlayOpen && !selectionMode && (
        <div className="fixed bottom-5 left-1/2 z-40 hidden -translate-x-1/2 animate-fade-up sm:block">
          <div className={cn("flex items-end gap-2 rounded-[26px] px-3 pb-2.5 pt-3 shadow-dock", theme.isDark ? "glass-dark" : "glass border border-white/70")}>
            {pinnedSites.map((s) => (
              <DockButton key={s.id} label={s.title} onClick={() => openSite(s)}>
                <SiteIcon site={s} size={44} className="rounded-[12px] shadow-md" />
              </DockButton>
            ))}
            <div className="mx-1.5 mb-3 w-px self-stretch bg-black/8" />
            <DockButton label="Search" onClick={() => setCommandOpen(true)}>
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-slate-100/80 shadow-md"><Icons.Search className="h-5 w-5 text-slate-500" /></div>
            </DockButton>
            <DockButton label="Add site" onClick={() => setEditor({ siteId: null })}>
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/25"><Icons.Plus className="h-5 w-5 text-white" /></div>
            </DockButton>
          </div>
        </div>
      )}

      <CommandPalette
        open={commandOpen}
        query={commandQuery}
        onQueryChange={setCommandQuery}
        results={paletteResults}
        onSelect={openSite}
        onInfo={setInfoId}
        onClose={() => { setCommandOpen(false); setCommandQuery(""); }}
        dark={theme.isDark}
      />

      <SiteEditor
        open={!!editor}
        site={editingSite}
        onClose={() => setEditor(null)}
        onSave={saveDraft}
        aiApiKey={aiApiKey}
        defaults={{
          project: project !== ALL_PROJECTS ? project : "",
          category: category !== ALL_CATEGORIES ? category : "",
          group: group !== ALL_GROUPS ? group : "",
        }}
        dark={theme.isDark}
      />

      {settingsOpen && (
        <Drawer title="Settings" onClose={() => setSettingsOpen(false)}>
          <SettingsSection title="Appearance" icon={<Icons.Settings />}>
            <SettingRow label="Theme" description="Light, night or high contrast">
              <SettingSelect value={prefs.theme} onChange={(v) => setPrefs((p) => ({ ...p, theme: v as Prefs["theme"] }))} options={[{ value: "macLight", label: "Light" }, { value: "macNight", label: "Night" }, { value: "autoContrast", label: "High contrast" }]} />
            </SettingRow>
            <SettingRow label="Density">
              <SettingSelect value={prefs.density} onChange={(v) => setPrefs((p) => ({ ...p, density: v as Prefs["density"] }))} options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }]} />
            </SettingRow>
            <SettingRow label="Dock" description="Bottom bar with top favorites">
              <Toggle checked={prefs.showDock} onChange={(v) => setPrefs((p) => ({ ...p, showDock: v }))} />
            </SettingRow>
          </SettingsSection>
          <SettingsSection title="Layout" icon={<Icons.Collections />}>
            <SettingRow label="View">
              <SettingSelect value={prefs.view} onChange={(v) => setPrefs((p) => ({ ...p, view: v as Prefs["view"] }))} options={[{ value: "cards", label: "Cards" }, { value: "icons", label: "Icons" }, { value: "list", label: "List" }]} />
            </SettingRow>
            <SettingRow label={`Columns: ${prefs.columns}`} description="Cards view, wide screens">
              <input aria-label="Columns" type="range" min={2} max={5} value={prefs.columns} onChange={(e) => setPrefs((p) => ({ ...p, columns: Number(e.target.value) as Prefs["columns"] }))} className="w-24" />
            </SettingRow>
            <SettingRow label={`Icon size: ${prefs.iconSize}px`}>
              <input aria-label="Icon size" type="range" min={24} max={72} value={prefs.iconSize} onChange={(e) => setPrefs((p) => ({ ...p, iconSize: Number(e.target.value) }))} className="w-24" />
            </SettingRow>
            <SettingRow label="Screenshots" description="Website previews in cards view">
              <Toggle checked={prefs.showScreenshot} onChange={(v) => setPrefs((p) => ({ ...p, showScreenshot: v }))} />
            </SettingRow>
            <SettingRow label="Focus mode" description="Hide the sidebar">
              <Toggle checked={prefs.focusMode} onChange={(v) => setPrefs((p) => ({ ...p, focusMode: v }))} />
            </SettingRow>
          </SettingsSection>
          <SettingsSection title="AI auto-fill" icon={<Icons.Search />}>
            <SettingRow label="OpenAI API key" description="Stored only in this browser's localStorage and sent only to api.openai.com">
              <input aria-label="OpenAI API key" type="password" autoComplete="off" value={aiApiKey} onChange={(e) => setAiApiKey(e.target.value.trim())} placeholder="sk-..." className="h-9 w-40 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900/90" />
            </SettingRow>
          </SettingsSection>
          <SettingsSection title="Data" icon={<Icons.Collections />}>
            <div className="grid grid-cols-2 gap-2">
              <SettingButton variant="secondary" onClick={exportData}>Export JSON</SettingButton>
              <label className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-white/5">
                Import <input type="file" accept=".json,application/json" onChange={importData} className="hidden" />
              </label>
            </div>
            <SettingButton variant="secondary" onClick={restoreBackup}>Restore from backup</SettingButton>
          </SettingsSection>
          <SettingsSection title="Info" icon={<Icons.Library />}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Sites</span><span className="font-semibold">{sites.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Favorites</span><span className="font-semibold">{favoritesCount}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Projects</span><span className="font-semibold">{projects.length - 1}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Shortcuts</span><span className="font-mono text-xs">⌘K · ⌘, · 1–9 · Esc</span></div>
            </div>
          </SettingsSection>
          <SettingButton variant="danger" onClick={() => { if (window.confirm("Reset all display settings?")) setPrefs(defaultPrefs); }}>Reset settings</SettingButton>
        </Drawer>
      )}

      {collectionEditorOpen && (
        <Drawer title="New smart collection" onClose={() => setCollectionEditorOpen(false)}>
          <CollectionEditor
            projects={projects.filter((p) => p !== ALL_PROJECTS)}
            tags={allTags.map(([t]) => t)}
            onSave={(name, rules) => {
              setCollections((prev) => [...prev, { id: uid(), name, rules }]);
              setCollectionEditorOpen(false);
              showToast(`Collection "${name}" created`);
            }}
            onCancel={() => setCollectionEditorOpen(false)}
          />
        </Drawer>
      )}

      {moveOpen && (
        <Drawer title={`Move ${selectedIds.size} sites`} onClose={() => setMoveOpen(false)}>
          <MoveForm onSubmit={bulkMove} onCancel={() => setMoveOpen(false)} />
        </Drawer>
      )}

      {templatesOpen && (
        <Drawer title="Site templates" onClose={() => setTemplatesOpen(false)}>
          <p className="mb-4 text-sm text-slate-500">Import curated sets of sites. URLs already in your library are skipped.</p>
          {siteTemplates.map((template) => {
            const checked = selectedTemplates.has(template.id);
            return (
              <label key={template.id} className={cn("mb-3 flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition", checked ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30" : "border-slate-200 hover:bg-black/5 dark:border-slate-700")}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setSelectedTemplates((prev) => { const n = new Set(prev); if (n.has(template.id)) n.delete(template.id); else n.add(template.id); return n; })}
                  className="h-4 w-4 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-semibold">{template.name}</p>
                  <p className="text-xs text-slate-500">{template.sites.length} sites · {template.description}</p>
                </div>
              </label>
            );
          })}
          <SettingButton
            variant="primary"
            disabled={selectedTemplates.size === 0}
            onClick={() => {
              const existing = new Set(sites.map((s) => s.url.replace(/\/$/, "")));
              const incoming = siteTemplates
                .filter((t) => selectedTemplates.has(t.id))
                .flatMap((t) => t.sites)
                .filter((s) => { const key = s.url.replace(/\/$/, ""); if (existing.has(key)) return false; existing.add(key); return true; });
              setSites((prev) => normalizeOrder([...prev, ...incoming.map((s, i) => ({ ...s, id: uid(), favorite: false, visits: 0, order: prev.length + i + 1 }))]));
              showToast(`Added ${incoming.length} sites from ${selectedTemplates.size} templates`);
              setSelectedTemplates(new Set());
              setTemplatesOpen(false);
            }}
          >
            Import ({selectedTemplates.size})
          </SettingButton>
        </Drawer>
      )}

      {toast && <Toast message={toast.message} onUndo={toast.undo ? () => undoDelete(toast.undo!) : undefined} />}
    </div>
  );
}

function DockButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="group relative flex flex-col items-center gap-1">
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900/90 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100">{label}</span>
      <div className="transition-all duration-300 group-hover:-translate-y-3 group-hover:scale-125 group-active:-translate-y-1 group-active:scale-105 motion-reduce:transform-none">{children}</div>
      <div className="h-1 w-1 rounded-full opacity-0" />
    </button>
  );
}

function CollectionEditor({ projects, tags, onSave, onCancel }: {
  projects: string[];
  tags: string[];
  onSave: (name: string, rules: SmartCollection["rules"]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyAi, setOnlyAi] = useState(false);
  const [minVisits, setMinVisits] = useState(0);
  const [project, setProject] = useState("");
  const [pickedTags, setPickedTags] = useState<string[]>([]);
  const field = "h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900/90";

  return (
    <div className="space-y-4">
      <input autoFocus aria-label="Collection name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Collection name" className={field} />
      <label className="flex items-center justify-between text-sm"><span>Favorites only</span><Toggle checked={onlyFavorites} onChange={setOnlyFavorites} /></label>
      <label className="flex items-center justify-between text-sm"><span>Enriched only</span><Toggle checked={onlyAi} onChange={setOnlyAi} /></label>
      <label className="block text-sm"><span>Min visits: {minVisits}</span><input type="range" min={0} max={20} value={minVisits} onChange={(e) => setMinVisits(Number(e.target.value))} className="w-full" /></label>
      <label className="block space-y-1 text-sm">
        <span>Project</span>
        <select value={project} onChange={(e) => setProject(e.target.value)} className={field}>
          <option value="">Any project</option>
          {projects.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      {tags.length > 0 && (
        <fieldset className="space-y-1 text-sm">
          <legend>Any of these tags</legend>
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => {
              const on = pickedTags.includes(t);
              return (
                <button type="button" key={t} aria-pressed={on} onClick={() => setPickedTags((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))} className={cn("rounded-lg border px-2 py-0.5 text-xs", on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 dark:border-slate-700")}>
                  #{t}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-semibold dark:border-slate-700">Cancel</button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => {
            const rules: SmartCollection["rules"] = {};
            if (onlyFavorites) rules.onlyFavorites = true;
            if (onlyAi) rules.onlyAiEnriched = true;
            if (minVisits > 0) rules.minVisits = minVisits;
            if (project) rules.project = project;
            if (pickedTags.length) rules.tags = pickedTags;
            onSave(name.trim(), rules);
          }}
          className="h-10 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white disabled:opacity-50"
        >Create</button>
      </div>
    </div>
  );
}

function MoveForm({ onSubmit, onCancel }: { onSubmit: (t: { project: string; category: string; group: string }) => void; onCancel: () => void }) {
  const [target, setTarget] = useState({ project: "", category: "", group: "" });
  const field = "h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900/90";
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit(target); }}>
      <p className="text-sm text-slate-500">Leave a field empty to keep each site's current value.</p>
      {(["project", "category", "group"] as const).map((k) => (
        <input key={k} aria-label={k} value={target[k]} onChange={(e) => setTarget((t) => ({ ...t, [k]: e.target.value }))} placeholder={k.charAt(0).toUpperCase() + k.slice(1)} className={field} />
      ))}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-semibold dark:border-slate-700">Cancel</button>
        <button type="submit" disabled={!target.project.trim() && !target.category.trim() && !target.group.trim()} className="h-10 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white disabled:opacity-50">Move</button>
      </div>
    </form>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}
