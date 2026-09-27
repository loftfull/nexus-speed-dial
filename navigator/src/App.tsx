import { ChangeEvent, useEffect, useMemo, useState, useCallback } from "react";
import { cn } from "./utils/cn";
import { Site, Mode, Prefs, SmartCollection } from "./types";
import { siteTemplates } from "./data/siteTemplates";

/* Components */
import { Icons } from "./components/ui/Icons";
import { SidebarSection, SidebarButton } from "./components/ui/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import { SiteCard } from "./components/SiteCard";
import { AddSiteModal } from "./components/AddSiteModal";
import { Toast, Drawer } from "./components/ui/Drawer";
import { SettingsSection, SettingRow, SettingSelect, SettingButton } from "./components/Settings";

/* Helpers */
import { faviconUrl, toSite, hostOf, unique } from "./utils/helpers";

/* Types & Constants */
interface Session {
  id: string;
  name: string;
  siteIds: string[];
  createdAt: string;
  autoOpen?: boolean;
}

const SITES_KEY = "nexus-v7-sites";
const PREFS_KEY = "nexus-v7-prefs";
const AI_KEY = "nexus-v7-ai-key";
const SESSIONS_KEY = "nexus-v7-sessions";

const ALL_PROJECTS = "All projects";
const ALL_CATEGORIES = "All categories";
const ALL_GROUPS = "All groups";

const defaultPrefs: Prefs = {
  view: "cards", columns: 2, iconSize: 44, showScreenshot: true, sort: "manual",
  theme: "macLight", density: "compact", floatingCards: true, focusMode: false,
  automotiveMode: false, showDock: true,
};

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

export default function App() {
  const [sites, setSites] = useState<Site[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [mode, setMode] = useState<Mode>("all");
  const [project, setProject] = useState(ALL_PROJECTS);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [group, setGroup] = useState(ALL_GROUPS);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aiApiKey, setAiApiKey] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [deletedSites, setDeletedSites] = useState<{ site: Site; index: number }[]>([]);

  // Restored Features State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collectionEditorOpen, setCollectionEditorOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [smartCollections, setSmartCollections] = useState<SmartCollection[]>([
    { id: "s1", name: "Favorites", emoji: "", rules: { onlyFavorites: true } },
    { id: "s2", name: "AI Enriched", emoji: "", rules: { onlyAiEnriched: true } },
  ]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  const isOverlayOpen = sidebarOpen || addOpen || !!infoId || commandOpen || !!editId || settingsOpen || collectionEditorOpen || templatesOpen;

  useEffect(() => {
    document.body.style.overflow = isOverlayOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOverlayOpen]);

  /* Persistence */
  useEffect(() => {
    const s = localStorage.getItem(SITES_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      setSites(parsed.length > 0 ? parsed : seedSites);
    } else {
      setSites(seedSites);
    }
    const p = localStorage.getItem(PREFS_KEY); if (p) setPrefs(prev => ({ ...prev, ...JSON.parse(p) }));
    const a = localStorage.getItem(AI_KEY); if (a) setAiApiKey(a);
    const ss = localStorage.getItem(SESSIONS_KEY); if (ss) setSessions(JSON.parse(ss));
  }, []);

  useEffect(() => localStorage.setItem(SITES_KEY, JSON.stringify(sites)), [sites]);
  useEffect(() => localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)), [prefs]);
  useEffect(() => localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)), [sessions]);
  useEffect(() => { aiApiKey ? localStorage.setItem(AI_KEY, aiApiKey) : localStorage.removeItem(AI_KEY) }, [aiApiKey]);

  // Auto backup
  useEffect(() => {
    if (sites.length === 0) return;
    try {
      localStorage.setItem("nexus-backup", JSON.stringify({
        version: 2,
        timestamp: new Date().toISOString(),
        sites, prefs, sessions
      }));
    } catch {}
  }, [sites, prefs, sessions]);

  const showToast = (m: string) => { setToastMessage(m); setTimeout(() => setToastMessage(null), 4000); };
  
  const visibleSites = useMemo(() => {
    const list = sites.filter(site => {
      if (mode === "favorites" && !site.favorite) return false;
      if (mode === "recent" && site.visits < 1) return false;
      if (project !== ALL_PROJECTS && site.project !== project) return false;
      if (category !== ALL_CATEGORIES && site.category !== category) return false;
      if (group !== ALL_GROUPS && site.group !== group) return false;
      return true;
    });
    if (prefs.sort === "alphabetical") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (prefs.sort === "mostVisited") return [...list].sort((a, b) => b.visits - a.visits);
    return [...list].sort((a, b) => a.order - b.order);
  }, [sites, mode, project, category, group, prefs.sort]);

  const pinnedSites = useMemo(() => sites.filter(s => s.favorite).sort((a,b) => b.visits - a.visits).slice(0, 8), [sites]);
  const favoritesCount = useMemo(() => sites.filter(s => s.favorite).length, [sites]);
  const recentCount = useMemo(() => sites.filter(s => s.visits > 0).length, [sites]);

  const projects = useMemo(() => [ALL_PROJECTS, ...unique(sites.map(s => s.project))], [sites]);
  const categories = useMemo(() => project === ALL_PROJECTS ? [] : unique(sites.filter(s => s.project === project).map(s => s.category)), [project, sites]);
  const groups = useMemo(() => (project === ALL_PROJECTS || category === ALL_CATEGORIES) ? [] : unique(sites.filter(s => s.project === project && s.category === category).map(s => s.group)), [project, category, sites]);
  const allTags = useMemo(() => {
    const counts: Record<string, number> = {};
    sites.forEach(s => s.tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [sites]);

  const themeClasses = useMemo(() => {
    if (prefs.theme === "macNight") return {
      shell: "bg-[#0c0d18] text-slate-100",
      panel: "glass-dark shadow-panel",
      card: "glass-dark card-lift",
      subtle: "text-slate-500",
      isDark: true,
    };
    return {
      shell: "text-slate-900",
      panel: "glass shadow-panel",
      card: "glass-subtle card-lift shadow-float",
      subtle: "text-slate-400",
      isDark: false,
    };
  }, [prefs.theme]);

  const openSite = useCallback((site: Site) => {
    setSites(prev => prev.map(s => s.id === site.id ? { ...s, visits: s.visits + 1 } : s));
    window.open(site.url, "_blank", "noopener,noreferrer");
  }, []);

  const copySiteUrl = useCallback(async (site: Site) => {
    try { await navigator.clipboard.writeText(site.url); showToast("URL Copied"); } catch {}
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setSites(prev => prev.map(s => s.id === id ? { ...s, favorite: !s.favorite } : s));
  }, []);

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const reorderSite = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId || prefs.sort !== "manual") return;
    setSites(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const from = sorted.findIndex(s => s.id === sourceId);
      const to = sorted.findIndex(s => s.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...sorted];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }, [prefs.sort]);

  const saveCurrentAsSession = () => {
    const name = prompt("Session name:");
    if (!name) return;
    const session: Session = {
      id: `session-${Date.now()}`,
      name,
      siteIds: visibleSites.map(s => s.id),
      createdAt: new Date().toISOString(),
    };
    setSessions(prev => [...prev, session]);
    showToast(`Session "${name}" saved with ${visibleSites.length} sites`);
  };

  const openSession = useCallback((session: Session) => {
    showToast(`Opening ${session.siteIds.length} sites...`);
    session.siteIds.forEach((id, i) => {
      const s = sites.find(x => x.id === id);
      if (s) setTimeout(() => openSite(s), i * 150);
    });
  }, [sites, openSite]);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    showToast("Session deleted");
  }, []);

  const removeSite = (id: string) => {
    setSites(prev => {
      const idx = prev.findIndex(x => x.id === id);
      if (idx > -1) {
        setDeletedSites([{ site: prev[idx], index: idx }]);
        showToast(`Deleted ${prev[idx].title}`);
      }
      return prev.filter(s => s.id !== id);
    });
    setMenuId(null);
  };

  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(String(reader.result));
        if (p.sites) setSites(p.sites.map((s: any, i: number) => toSite(s, i)));
        if (p.prefs) setPrefs(prev => ({ ...prev, ...p.prefs }));
        showToast("Data imported");
      } catch { showToast("Import failed"); }
    };
    reader.readAsText(file);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 2, sites, prefs, sessions }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nexus-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast("Exported successfully");
  };

  const undoDelete = () => {
    if (!deletedSites.length) return;
    setSites(prev => {
      const next = [...prev];
      deletedSites.forEach(({ site, index }) => next.splice(index, 0, site));
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
    setDeletedSites([]);
    setToastMessage(null);
  };

  /* Bulk Actions */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const bulkDelete = () => {
    if (!selectedIds.size) return;
    setSites(prev => {
      const toDelete: { site: Site; index: number }[] = [];
      const remaining: Site[] = [];
      prev.forEach((s, i) => {
        if (selectedIds.has(s.id)) toDelete.push({ site: s, index: i });
        else remaining.push(s);
      });
      setDeletedSites(toDelete);
      showToast(`Deleted ${toDelete.length} sites`);
      return remaining;
    });
    clearSelection();
  };

  const bulkFavorite = (val: boolean) => {
    if (!selectedIds.size) return;
    setSites(prev => prev.map(s => selectedIds.has(s.id) ? { ...s, favorite: val } : s));
    showToast(`${val ? 'Favorited' : 'Unfavorited'} ${selectedIds.size} sites`);
    clearSelection();
  };

  const bulkOpen = () => {
    if (!selectedIds.size) return;
    sites.filter(s => selectedIds.has(s.id)).forEach((s, i) => {
      setTimeout(() => openSite(s), i * 150);
    });
    showToast(`Opening ${selectedIds.size} sites...`);
    clearSelection();
  };

  const selectedInfo = useMemo(() => sites.find(s => s.id === infoId) || null, [infoId, sites]);

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const urlMatch = text.match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)/);
      if (!urlMatch) { showToast("No URL found in clipboard"); return; }
      const url = urlMatch[0].startsWith("http") ? urlMatch[0] : `https://${urlMatch[0]}`;
      
      showToast("Fetching site data...");
      const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=true`);
      const json = await res.json();
      const data = json?.data || {};
      
      const newSite: Site = {
        id: `site-${Date.now()}`,
        title: data.title || hostOf(url),
        url,
        description: data.description || "",
        project: project !== ALL_PROJECTS ? project : "General",
        category: category !== ALL_CATEGORIES ? category : data.publisher || "General",
        group: group !== ALL_GROUPS ? group : "General",
        tags: [],
        icon: data.logo?.url,
        screenshot: data.image?.url,
        extractedAt: new Date().toISOString(),
        favorite: false,
        visits: 0,
        order: 0,
      };
      
      setSites(prev => [newSite, ...prev].map((s, i) => ({ ...s, order: i + 1 })));
      showToast(`Added ${newSite.title}`);
    } catch {
      showToast("Failed to read clipboard");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
      if (e.key === "Escape") {
        setSidebarOpen(false);
        setSettingsOpen(false);
        setAddOpen(false);
        setInfoId(null);
        setEditId(null);
        setMenuId(null);
        setCommandOpen(false);
      }
      if (/^[1-9]$/.test(e.key)) {
        const target = e.target as HTMLElement;
        if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
        const picked = visibleSites[Number(e.key) - 1];
        if (picked) openSite(picked);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visibleSites, openSite]);

  return (
    <div className={cn("min-h-dvh transition-colors duration-700", themeClasses.shell)}>
      {/* Mobile sidebar overlay */}
      <div
        className={cn("fixed inset-0 z-40 transition-all duration-300 lg:hidden", sidebarOpen ? "opacity-100 backdrop-blur-sm bg-black/30" : "pointer-events-none opacity-0")}
        onClick={() => setSidebarOpen(false)}
      />

      <div className={cn("min-h-dvh", !prefs.focusMode && "lg:grid lg:grid-cols-[264px_1fr]")}>
        {!prefs.focusMode && (
          <aside className={cn(
            "fixed left-0 top-0 z-50 flex h-dvh w-[264px] flex-col p-4 transition-transform duration-300 ease-out",
            "lg:sticky lg:h-screen lg:translate-x-0 lg:border-r lg:border-white/40",
            themeClasses.panel,
            sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          )}>
            {/* Brand */}
            <div className="mb-6 flex items-center gap-3 px-1 pt-1">
              <div className={cn(
                "grid h-9 w-9 place-items-center rounded-2xl text-sm font-bold text-white",
                "bg-gradient-to-br from-blue-500 to-indigo-600",
                "shadow-lg shadow-blue-500/25"
              )}>N</div>
              <div>
                <p className="text-[13px] font-semibold tracking-tight">Nexus</p>
                <p className="text-[10px] text-slate-400 font-medium">{sites.length} sites</p>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto scrollbar-hide pb-4">
              <SidebarSection label="Library" icon={<Icons.Library />}>
                {(["all", "favorites", "recent"] as const).map(m => (
                  <SidebarButton key={m} active={mode === m} onClick={() => { setMode(m); setSidebarOpen(false); }} count={m === "all" ? sites.length : m === "favorites" ? favoritesCount : recentCount}>{m.charAt(0).toUpperCase() + m.slice(1)}</SidebarButton>
                ))}
              </SidebarSection>
              <SidebarSection label="Projects" icon={<Icons.Projects />}>
                {projects.map(p => <SidebarButton key={p} active={project === p} onClick={() => { setProject(p); setCategory(ALL_CATEGORIES); setGroup(ALL_GROUPS); setSidebarOpen(false); }} count={p !== ALL_PROJECTS ? sites.filter(s => s.project === p).length : undefined}>{p}</SidebarButton>)}
              </SidebarSection>

              {categories.length > 0 && (
                <SidebarSection label="Categories" icon={<Icons.Collections />}>
                  <SidebarButton active={category === ALL_CATEGORIES} onClick={() => { setCategory(ALL_CATEGORIES); setGroup(ALL_GROUPS); setSidebarOpen(false); }}>All categories</SidebarButton>
                  {categories.map(c => <SidebarButton key={c} active={category === c} onClick={() => { setCategory(c); setGroup(ALL_GROUPS); setSidebarOpen(false); }}>{c}</SidebarButton>)}
                </SidebarSection>
              )}

              {groups.length > 0 && (
                <SidebarSection label="Groups" icon={<Icons.Tags />}>
                  <SidebarButton active={group === ALL_GROUPS} onClick={() => { setGroup(ALL_GROUPS); setSidebarOpen(false); }}>All groups</SidebarButton>
                  {groups.map(g => <SidebarButton key={g} active={group === g} onClick={() => { setGroup(g); setSidebarOpen(false); }}>{g}</SidebarButton>)}
                </SidebarSection>
              )}

              <SidebarSection label="Collections" icon={<Icons.Collections />}>
                {smartCollections.map(c => {
                  const count = sites.filter(s => {
                    const r = c.rules;
                    if (r.onlyFavorites && !s.favorite) return false;
                    if (r.onlyAiEnriched && !s.extractedAt) return false;
                    if (r.minVisits && s.visits < r.minVisits) return false;
                    return true;
                  }).length;
                  return (
                    <div key={c.id} className="group flex items-center gap-1">
                      <SidebarButton active={activeCollectionId === c.id} count={count} onClick={() => {
                        setActiveCollectionId(activeCollectionId === c.id ? null : c.id);
                        setSidebarOpen(false);
                      }}>{c.name}</SidebarButton>
                      <button onClick={() => setSmartCollections(prev => prev.filter(x => x.id !== c.id))} className="hidden h-6 w-6 items-center justify-center rounded text-xs text-slate-400 hover:text-rose-500 group-hover:flex">×</button>
                    </div>
                  );
                })}
                <button onClick={() => setCollectionEditorOpen(true)} className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-[12px] font-medium text-blue-600 hover:bg-blue-50/50 transition">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/20"><Icons.Plus className="w-3 h-3" /></span>
                  New Collection
                </button>
              </SidebarSection>

              {allTags.length > 0 && (
                <SidebarSection label="Tags" icon={<Icons.Tags />}>
                  <div className="flex flex-wrap gap-1 px-1">
                    {allTags.map(([tag]) => (
                      <button
                        key={tag}
                        onClick={() => { setMode("tag" as Mode); setSidebarOpen(false); }}
                        className="rounded-lg border border-slate-200/50 bg-white/50 px-2 py-0.5 text-[10px] font-medium text-slate-500 transition hover:border-slate-300 hover:bg-white"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </SidebarSection>
              )}

              {sessions.length > 0 && (
                <SidebarSection label="Sessions" icon={<Icons.TopVisited />}>
                  {sessions.map(s => (
                    <div key={s.id} className="group flex items-center gap-1">
                      <SidebarButton active={false} onClick={() => openSession(s)} count={s.siteIds.length}>{s.name}</SidebarButton>
                      <button onClick={() => deleteSession(s.id)} className="hidden h-6 w-6 items-center justify-center rounded text-xs text-slate-400 hover:text-rose-500 group-hover:flex">×</button>
                    </div>
                  ))}
                </SidebarSection>
              )}

              <SidebarSection label="Quick Access" icon={<Icons.TopVisited />}>
                {pinnedSites.length > 0 ? pinnedSites.slice(0, 5).map((s, i) => (
                  <button key={s.id} onClick={() => openSite(s)} className="flex h-9 w-full items-center gap-3 rounded-xl px-2.5 text-[13px] text-slate-500 hover:bg-black/5 transition">
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold", i === 0 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500")}>{i+1}</span>
                    <img src={faviconUrl(s)} alt="" className="h-4 w-4 rounded" />
                    <span className="truncate">{s.title}</span>
                  </button>
                )) : <p className="px-3 text-xs text-slate-400">Star sites to see them here</p>}
              </SidebarSection>

              <div className="pt-4 space-y-1">
                <button onClick={saveCurrentAsSession} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-purple-600 hover:bg-purple-50/50 transition">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm shadow-purple-600/20"><Icons.Plus className="w-3 h-3" /></span>
                  Save as Session
                </button>
                <button onClick={() => setTemplatesOpen(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-emerald-600 hover:bg-emerald-50/50 transition">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"><Icons.Plus className="w-3 h-3" /></span>
                  Import Templates
                </button>
              </div>
            </div>
          </aside>
        )}

        <main className="min-w-0">
          <header className="sticky top-0 z-30 p-3 md:p-4">
            <div className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5",
              "glass shadow-header animate-fade-in"
            )}>
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-black/5 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide text-[11px] font-semibold tracking-[0.08em]">
                <span className="chip chip-blue">{project}</span>
                {category !== ALL_CATEGORIES && <><span className="text-slate-300">/</span><span className="chip">{category}</span></>}
                {group !== ALL_GROUPS && <><span className="text-slate-300">/</span><span className="chip">{group}</span></>}
                {(project !== ALL_PROJECTS || category !== ALL_CATEGORIES || group !== ALL_GROUPS) && (
                  <button onClick={() => { setProject(ALL_PROJECTS); setCategory(ALL_CATEGORIES); setGroup(ALL_GROUPS); setMode("all"); }} className="chip hover:bg-black/5">Clear</button>
                )}
                <span className={cn("ml-auto chip", themeClasses.subtle)}>{visibleSites.length} sites</span>
              </div>
              <div className="flex items-center gap-2">
                {!selectionMode && <button onClick={() => setSelectionMode(true)} className="h-9 px-3 rounded-xl border border-slate-200 bg-white/50 text-xs font-semibold hover:bg-white transition">Select</button>}
                {selectionMode && selectedIds.size > 0 && (
                   <>
                     <button onClick={() => bulkFavorite(true)} className="h-9 px-2 rounded-xl bg-white text-amber-500 shadow-sm text-sm">★</button>
                     <button onClick={() => bulkFavorite(false)} className="h-9 px-2 rounded-xl bg-white text-slate-400 shadow-sm text-sm">☆</button>
                     <button onClick={bulkOpen} className="h-9 px-3 rounded-xl bg-white shadow-sm text-xs font-bold">Open {selectedIds.size}</button>
                     <button onClick={bulkDelete} className="h-9 px-3 rounded-xl bg-rose-500 text-white shadow-sm text-xs font-bold">Delete</button>
                   </>
                )}
                {selectionMode && <button onClick={clearSelection} className="h-9 px-3 rounded-xl bg-blue-600 text-white shadow-sm text-xs font-bold">Done</button>}

                {!selectionMode && (
                  <>
                    <select value={prefs.sort} onChange={e => setPrefs(p => ({...p, sort: e.target.value as any}))} className="hidden sm:inline-flex h-9 rounded-xl border border-black/5 bg-white/50 px-3 text-xs font-semibold outline-none hover:bg-white transition cursor-pointer">
                      <option value="manual">Manual</option>
                      <option value="alphabetical">A → Z</option>
                      <option value="mostVisited">Most visited</option>
                    </select>
                    <button onClick={() => setCommandOpen(true)} className="hidden sm:inline-flex h-9 px-3 rounded-xl border border-black/5 bg-white/50 text-xs font-semibold hover:bg-white transition">⌘K</button>
                    <button onClick={pasteFromClipboard} className="hidden sm:inline-flex h-9 px-3 rounded-xl border border-black/5 bg-white/50 text-xs font-semibold hover:bg-white transition text-emerald-600">Paste</button>
                    <button onClick={() => setSettingsOpen(true)} className="h-9 w-9 grid place-items-center rounded-xl border border-black/5 bg-white/50 hover:bg-white transition"><Icons.Settings /></button>
                    <button onClick={() => setAddOpen(true)} className="h-9 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold transition hover:bg-blue-700 shadow-lg shadow-blue-600/20">+ Add</button>
                  </>
                )}
              </div>
            </div>
          </header>

          <div className={cn(
            "p-3 md:p-5 grid gap-4",
            prefs.columns === 2 && "sm:grid-cols-2",
            prefs.columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
            prefs.columns === 4 && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
            prefs.columns === 5 && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
            !prefs.columns && "sm:grid-cols-2 xl:grid-cols-3",
          )}>
             {visibleSites.map((site, i) => (
               <div
                 key={site.id}
                 className="animate-fade-up"
                 style={{ animationDelay: `${Math.min(i * 30, 200)}ms` }}
                 draggable={prefs.sort === "manual"}
                 onDragStart={() => setDraggedId(site.id)}
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={() => { if (draggedId) { reorderSite(draggedId, site.id); setDraggedId(null); } }}
               >
                 <SiteCard
                   site={site} prefs={prefs} theme={themeClasses}
                   floatingShadow="shadow-float"
                   onOpen={openSite} onCopy={copySiteUrl} onInfo={setInfoId} onEdit={setEditId} onDelete={removeSite}
                   onToggleFavorite={toggleFavorite}
                   menuOpen={menuId === site.id} onToggleMenu={() => setMenuId(menuId === site.id ? null : site.id)}
                   onDragStart={() => setDraggedId(site.id)}
                   onDragOver={(e) => e.preventDefault()}
                   onDrop={() => {}}
                 />
               </div>
             ))}
             {!visibleSites.length && (
               <div className="col-span-full flex flex-col items-center justify-center py-24 text-center animate-fade-up">
                 <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl glass shadow-float">
                   <Icons.Collections className="w-10 h-10 text-slate-300" />
                 </div>
                 <h3 className="mb-2 text-lg font-semibold tracking-tight text-slate-700">Your library is empty</h3>
                 <p className="mb-6 max-w-xs text-sm leading-relaxed text-slate-400">Start adding sites by clicking + Add, or paste a URL directly from your clipboard.</p>
                 <div className="flex gap-3">
                   <button onClick={() => setAddOpen(true)} className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition">+ Add Site</button>
                   <button onClick={pasteFromClipboard} className="rounded-2xl glass px-5 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-white transition">Paste URL</button>
                 </div>
               </div>
             )}
           </div>
        </main>
      </div>

      {/* Info Drawer */}
      {selectedInfo && (
        <Drawer title="Site Information" onClose={() => setInfoId(null)}>
          <div className="flex items-center gap-4 mb-6">
            <img src={faviconUrl(selectedInfo)} alt="" className="h-14 w-14 rounded-2xl shadow-sm" />
            <div>
              <p className="font-bold text-lg">{selectedInfo.title}</p>
              <p className="text-sm text-slate-500">{hostOf(selectedInfo.url)}</p>
            </div>
          </div>
          <div className="space-y-3">
            <InfoBlock label="Path" value={`${selectedInfo.project} / ${selectedInfo.category} / ${selectedInfo.group}`} />
            <InfoBlock label="Description" value={selectedInfo.description || "No description"} />
            {selectedInfo.longDescription && <InfoBlock label="Details" value={selectedInfo.longDescription} />}
            <InfoBlock label="Tags" value={selectedInfo.tags.length ? selectedInfo.tags.join(", ") : "None"} />
            <InfoBlock label="Visits" value={String(selectedInfo.visits)} />
            {selectedInfo.extractedAt && <InfoBlock label="AI Enriched" value={new Date(selectedInfo.extractedAt).toLocaleDateString()} />}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => { copySiteUrl(selectedInfo); }} className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">Copy URL</button>
            <button onClick={() => { openSite(selectedInfo); setInfoId(null); }} className="h-10 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white">Open</button>
          </div>
        </Drawer>
      )}

      {/* macOS-style Dock */}
      {prefs.showDock && pinnedSites.length > 0 && !isOverlayOpen && (
        <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 animate-fade-up">
          <div className={cn(
            "flex items-end gap-2 px-3 pt-3 pb-2.5 rounded-[26px]",
            "glass shadow-dock",
            "border border-white/70"
          )}>
            {pinnedSites.map(s => (
              <button
                key={s.id}
                onClick={() => openSite(s)}
                className="group relative flex flex-col items-center gap-1"
              >
                {/* Tooltip */}
                <span className={cn(
                  "absolute -top-9 left-1/2 -translate-x-1/2",
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-slate-900/90 backdrop-blur",
                  "opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none whitespace-nowrap",
                  "shadow-lg"
                )}>
                  {s.title}
                </span>

                {/* Icon */}
                <div className="w-11 h-11 rounded-[12px] overflow-hidden shadow-md transition-all duration-300 group-hover:-translate-y-3 group-hover:scale-125 group-active:scale-105 group-active:-translate-y-1">
                  <img
                    src={faviconUrl(s)}
                    alt={s.title}
                    className="w-full h-full object-cover bg-white"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?sz=128&domain=${s.url}`; }}
                  />
                </div>

                {/* Active dot */}
                <div className={cn(
                  "w-1 h-1 rounded-full transition-all duration-200",
                  mode === "all" ? "bg-slate-400/60" : "opacity-0"
                )} />
              </button>
            ))}

            {/* Divider */}
            <div className="self-stretch w-px bg-black/8 mx-1.5 mb-3" />

            {/* Search */}
            <button onClick={() => setCommandOpen(true)} className="group relative flex flex-col items-center gap-1">
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-slate-900/90 backdrop-blur opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow-lg">Search</span>
              <div className="w-11 h-11 rounded-[12px] bg-slate-100/80 flex items-center justify-center shadow-md transition-all duration-300 group-hover:-translate-y-3 group-hover:scale-125 group-active:scale-105">
                <Icons.Search className="w-5 h-5 text-slate-500" />
              </div>
              <div className="w-1 h-1 rounded-full opacity-0" />
            </button>

            {/* Add */}
            <button onClick={() => setAddOpen(true)} className="group relative flex flex-col items-center gap-1">
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-slate-900/90 backdrop-blur opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow-lg">Add Site</span>
              <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 transition-all duration-300 group-hover:-translate-y-3 group-hover:scale-125 group-active:scale-105">
                <Icons.Plus className="w-5 h-5 text-white" />
              </div>
              <div className="w-1 h-1 rounded-full opacity-0" />
            </button>
          </div>
        </div>
      )}

      <CommandPalette open={commandOpen} query={commandQuery} onQueryChange={setCommandQuery} results={visibleSites} onSelect={openSite} onInfo={setInfoId} onClose={() => setCommandOpen(false)} dark={prefs.theme === "macNight"} />
      <AddSiteModal open={addOpen} onClose={() => setAddOpen(false)} onSave={(s) => setSites(p => [toSite(s as any, 0), ...p])} aiApiKey={aiApiKey} defaultProject={project} defaultCategory={category} defaultGroup={group} dark={prefs.theme === "macNight"} />
      
      {settingsOpen && (
        <Drawer title="Settings" onClose={() => setSettingsOpen(false)}>
           <SettingsSection title="Appearance" icon={<Icons.Settings />}>
             <SettingRow label="Theme" description="Switch between visual profiles">
               <SettingSelect value={prefs.theme} onChange={(v) => setPrefs(p => ({...p, theme: v as any}))} options={[{value:'macLight',label:'Light'},{value:'macNight',label:'Night'},{value:'autoContrast',label:'Contrast'}]} />
             </SettingRow>
             <SettingRow label="Dock" description="Show bottom favorites bar">
               <button onClick={() => setPrefs(p => ({...p, showDock: !p.showDock}))} className={cn("h-6 w-11 rounded-full transition-colors", prefs.showDock ? "bg-blue-600" : "bg-slate-300")}>
                 <span className={cn("block h-5 w-5 rounded-full bg-white transition-transform", prefs.showDock ? "translate-x-5" : "translate-x-1")} />
               </button>
             </SettingRow>
           </SettingsSection>
           <SettingsSection title="Layout" icon={<Icons.Collections />}>
             <SettingRow label="View" description="Choose how sites are displayed">
               <SettingSelect value={prefs.view} onChange={(v) => setPrefs(p => ({...p, view: v as any}))} options={[{value:'cards',label:'Cards'},{value:'icons',label:'Icons'},{value:'list',label:'List'}]} />
             </SettingRow>
             <SettingRow label={`Columns: ${prefs.columns}`}>
               <input type="range" min={2} max={5} value={prefs.columns} onChange={e => setPrefs(p => ({...p, columns: Number(e.target.value) as any}))} className="w-24" />
             </SettingRow>
             <SettingRow label={`Icon Size: ${prefs.iconSize}px`}>
               <input type="range" min={24} max={72} value={prefs.iconSize} onChange={e => setPrefs(p => ({...p, iconSize: Number(e.target.value)}))} className="w-24" />
             </SettingRow>
             <SettingRow label="Screenshots" description="Show website previews">
               <button onClick={() => setPrefs(p => ({...p, showScreenshot: !p.showScreenshot}))} className={cn("h-6 w-11 rounded-full transition-colors", prefs.showScreenshot ? "bg-blue-600" : "bg-slate-300")}>
                 <span className={cn("block h-5 w-5 rounded-full bg-white transition-transform", prefs.showScreenshot ? "translate-x-5" : "translate-x-1")} />
               </button>
             </SettingRow>
             <SettingRow label="Focus Mode" description="Hide sidebar for distraction-free view">
               <button onClick={() => setPrefs(p => ({...p, focusMode: !p.focusMode}))} className={cn("h-6 w-11 rounded-full transition-colors", prefs.focusMode ? "bg-blue-600" : "bg-slate-300")}>
                 <span className={cn("block h-5 w-5 rounded-full bg-white transition-transform", prefs.focusMode ? "translate-x-5" : "translate-x-1")} />
               </button>
             </SettingRow>
           </SettingsSection>
           <SettingsSection title="AI" icon={<Icons.Search />}>
             <SettingRow label="API Key" description="For smart auto-fill">
               <input type="password" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} placeholder="sk-..." className="h-9 w-40 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" />
             </SettingRow>
           </SettingsSection>
           <SettingsSection title="Data" icon={<Icons.Collections />}>
             <div className="grid grid-cols-2 gap-2">
                <SettingButton variant="secondary" onClick={exportData}>Export JSON</SettingButton>
                <label className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
                  Import <input type="file" accept=".json" onChange={importData} className="hidden" />
                </label>
             </div>
             <SettingButton variant="secondary" onClick={() => {
               const backup = localStorage.getItem("nexus-backup");
               if (backup) {
                 const parsed = JSON.parse(backup);
                 if (parsed.sites) { setSites(parsed.sites.map((s: any, i: number) => toSite(s, i))); }
                 if (parsed.prefs) { setPrefs((prev: any) => ({ ...prev, ...parsed.prefs })); }
                 if (parsed.sessions) { setSessions(parsed.sessions); }
                 showToast(`Restored from ${new Date(parsed.timestamp).toLocaleString()}`);
               } else { showToast("No backup found"); }
             }}>Restore from Backup</SettingButton>
           </SettingsSection>
           <SettingsSection title="Info" icon={<Icons.Library />}>
             <div className="space-y-2 text-sm">
               <div className="flex justify-between"><span className="text-slate-500">Sites</span><span className="font-semibold">{sites.length}</span></div>
               <div className="flex justify-between"><span className="text-slate-500">Favorites</span><span className="font-semibold">{favoritesCount}</span></div>
               <div className="flex justify-between"><span className="text-slate-500">Projects</span><span className="font-semibold">{projects.length - 1}</span></div>
             </div>
           </SettingsSection>
           <SettingButton variant="danger" onClick={() => { if(confirm('Reset all settings?')) setPrefs(defaultPrefs); }}>Reset Settings</SettingButton>
        </Drawer>
      )}

      {/* Collection Editor */}
      {collectionEditorOpen && (
        <Drawer title="New Smart Collection" onClose={() => setCollectionEditorOpen(false)}>
          <CollectionEditor onSave={(name, rules) => {
            setSmartCollections(prev => [...prev, { id: `col-${Date.now()}`, name, emoji: "", rules }]);
            setCollectionEditorOpen(false);
            showToast(`Collection "${name}" created`);
          }} onCancel={() => setCollectionEditorOpen(false)} />
        </Drawer>
      )}

      {/* Templates */}
      {templatesOpen && (
        <Drawer title="Site Templates" onClose={() => setTemplatesOpen(false)}>
          <p className="text-sm text-slate-500 mb-4">Import pre-built collections of popular sites</p>
          {siteTemplates.map(template => (
            <div key={template.id} className={cn("rounded-2xl border p-4 mb-3 cursor-pointer transition", selectedTemplates.has(template.id) ? "border-blue-600 bg-blue-50" : "hover:bg-black/5")} onClick={() => setSelectedTemplates(prev => { const n = new Set(prev); n.has(template.id) ? n.delete(template.id) : n.add(template.id); return n; })}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedTemplates.has(template.id)} readOnly className="h-4 w-4 rounded" />
                <div>
                  <p className="font-semibold text-sm">{template.name}</p>
                  <p className="text-xs text-slate-500">{template.sites.length} sites</p>
                </div>
              </div>
            </div>
          ))}
          <SettingButton variant="primary" onClick={() => {
            selectedTemplates.forEach(id => {
              const t = siteTemplates.find(x => x.id === id);
              if (t) {
                const newSites = t.sites.map((s, i) => ({ ...s, id: `tpl-${id}-${i}-${Date.now()}`, favorite: false, visits: 0, order: sites.length + i + 1 }));
                setSites(prev => [...prev, ...newSites]);
              }
            });
            showToast(`Imported ${selectedTemplates.size} templates`);
            setSelectedTemplates(new Set());
            setTemplatesOpen(false);
          }} disabled={selectedTemplates.size === 0}>Import ({selectedTemplates.size})</SettingButton>
        </Drawer>
      )}

      {toastMessage && <Toast message={toastMessage} onUndo={undoDelete} />}
    </div>
  );
}

/* Collection Editor Component */
function CollectionEditor({ onSave, onCancel }: {
  onSave: (name: string, rules: SmartCollection["rules"]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyAi, setOnlyAi] = useState(false);
  const [minVisits, setMinVisits] = useState(0);

  return (
    <div className="space-y-4">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Collection name" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" />
      <label className="flex items-center justify-between text-sm"><span>Favorites only</span><input type="checkbox" checked={onlyFavorites} onChange={e => setOnlyFavorites(e.target.checked)} /></label>
      <label className="flex items-center justify-between text-sm"><span>AI enriched only</span><input type="checkbox" checked={onlyAi} onChange={e => setOnlyAi(e.target.checked)} /></label>
      <label className="block text-sm"><span>Min visits: {minVisits}</span><input type="range" min={0} max={20} value={minVisits} onChange={e => setMinVisits(Number(e.target.value))} className="w-full" /></label>
      <div className="flex gap-2">
        <button onClick={onCancel} className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-semibold">Cancel</button>
        <button onClick={() => {
          if (!name.trim()) return;
          const rules: SmartCollection["rules"] = {};
          if (onlyFavorites) rules.onlyFavorites = true;
          if (onlyAi) rules.onlyAiEnriched = true;
          if (minVisits > 0) rules.minVisits = minVisits;
          onSave(name.trim(), rules);
        }} className="h-10 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white">Create</button>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}
