import { FormEvent, useEffect, useState } from "react";
import type { Site, SiteDraft } from "../types";
import { aiEnrich, EnrichError, fetchMetadata, normalizeUrl } from "../lib/enrich";
import { isHttpUrl } from "../lib/schema";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

type Draft = Record<"title" | "url" | "description" | "longDescription" | "project" | "category" | "group" | "tags" | "icon" | "screenshot", string>;

const fromSite = (s: Site): Draft => ({
  title: s.title,
  url: s.url,
  description: s.description,
  longDescription: s.longDescription ?? "",
  project: s.project,
  category: s.category,
  group: s.group,
  tags: s.tags.join(","),
  icon: s.icon ?? "",
  screenshot: s.screenshot ?? "",
});

const emptyDraft = (d: { project: string; category: string; group: string }): Draft => ({
  title: "", url: "", description: "", longDescription: "", tags: "", icon: "", screenshot: "", ...d,
});

type Status = { tone: "info" | "warn" | "error"; text: string } | null;

/** Add/edit form. With `site` it edits that site; otherwise it creates a new one. */
export function SiteEditor({
  open,
  site,
  onClose,
  onSave,
  aiApiKey,
  defaults,
  dark,
}: {
  open: boolean;
  site?: Site | null;
  onClose: () => void;
  onSave: (draft: SiteDraft) => void;
  aiApiKey: string;
  defaults: { project: string; category: string; group: string };
  dark?: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(() => (site ? fromSite(site) : emptyDraft(defaults)));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [enrichedAt, setEnrichedAt] = useState<string | undefined>(site?.extractedAt);

  useEffect(() => {
    if (!open) return;
    setDraft(site ? fromSite(site) : emptyDraft(defaults));
    setEnrichedAt(site?.extractedAt);
    setStatus(null);
    // Defaults are read only when the editor opens; later filter changes must not wipe the form.
  }, [open, site?.id]);

  if (!open) return null;

  const set = (key: keyof Draft) => (value: string) => setDraft((prev) => ({ ...prev, [key]: value }));
  const url = draft.url.trim() ? normalizeUrl(draft.url) : "";
  const urlValid = !url || isHttpUrl(url);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url || !urlValid) {
      setStatus({ tone: "error", text: "Enter a valid http(s) URL." });
      return;
    }
    onSave({
      title: draft.title.trim() || new URL(url).hostname,
      url,
      description: draft.description.trim(),
      longDescription: draft.longDescription.trim() || undefined,
      project: draft.project.trim() || "General",
      category: draft.category.trim() || "General",
      group: draft.group.trim() || "General",
      tags: Array.from(new Set(draft.tags.split(",").map((t) => t.trim()).filter(Boolean))),
      icon: draft.icon.trim() || undefined,
      screenshot: draft.screenshot.trim() || undefined,
      extractedAt: enrichedAt,
    });
    onClose();
  };

  const autofill = async () => {
    if (!url || !urlValid) {
      setStatus({ tone: "error", text: "Enter a valid URL first." });
      return;
    }
    setLoading(true);
    setStatus(null);
    const messages: string[] = [];
    let meta: Awaited<ReturnType<typeof fetchMetadata>> = {};
    let filled = false;
    try {
      meta = await fetchMetadata(url, { screenshot: true });
      filled = true;
      setDraft((p) => ({
        ...p,
        url,
        title: p.title || meta.title || "",
        description: p.description || meta.description || "",
        icon: p.icon || meta.icon || "",
        screenshot: p.screenshot || meta.screenshot || "",
        category: p.category || meta.publisher || "",
      }));
    } catch (err) {
      messages.push(`Metadata: ${err instanceof EnrichError ? err.message : "failed."}`);
    }

    if (aiApiKey) {
      try {
        const ai = await aiEnrich(aiApiKey, { url, title: meta.title, description: meta.description });
        filled = true;
        setDraft((p) => ({
          ...p,
          description: p.description || ai.shortDescription || "",
          longDescription: p.longDescription || ai.longDescription || "",
          tags: p.tags || (ai.tags ?? []).join(","),
          category: p.category || ai.category || "",
          group: p.group || ai.group || "",
        }));
      } catch (err) {
        messages.push(`AI: ${err instanceof EnrichError ? err.message : "failed."}`);
      }
    }

    if (filled) setEnrichedAt(new Date().toISOString());
    setStatus(
      !messages.length
        ? { tone: "info", text: aiApiKey ? "Filled from metadata and AI." : "Filled from metadata. Add an AI key in Settings for tags and descriptions." }
        : filled
          ? { tone: "warn", text: `Partially filled. ${messages.join("")}` }
          : { tone: "error", text: messages.join("") },
    );
    setLoading(false);
  };

  const toneClass = { info: "text-muted", warn: "text-amber-600", error: "text-rose-600" };

  return (
    <Modal onClose={onClose} dark={dark} labelledBy="site-editor-title">
      <form onSubmit={handleSubmit} className="space-y-3">
        <h2 id="site-editor-title" className="text-base font-bold">{site ? "Edit site" : "Add site"}</h2>
        <div className="flex gap-2">
          <Input autoFocus aria-label="URL" aria-invalid={!urlValid} value={draft.url} onChange={(e) => set("url")(e.target.value)} placeholder="https://example.com" className="flex-1" dark={dark} />
          <Button type="button" onClick={autofill} loading={loading} dark={dark}>Auto fill</Button>
        </div>
        {status && <p role="status" className={`text-xs ${toneClass[status.tone]}`}>{status.text}</p>}
        <Input aria-label="Title" value={draft.title} onChange={(e) => set("title")(e.target.value)} placeholder="Title" dark={dark} />
        <Input aria-label="Short description" value={draft.description} onChange={(e) => set("description")(e.target.value)} placeholder="Short description" dark={dark} />
        <textarea aria-label="Detailed description" value={draft.longDescription} onChange={(e) => set("longDescription")(e.target.value)} placeholder="Detailed description" className={`min-h-24 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft ${dark ? "border-slate-700 bg-slate-900/80 text-slate-100" : "border-slate-200 bg-white"}`} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input aria-label="Project" value={draft.project} onChange={(e) => set("project")(e.target.value)} placeholder="Project" dark={dark} />
          <Input aria-label="Category" value={draft.category} onChange={(e) => set("category")(e.target.value)} placeholder="Category" dark={dark} />
          <Input aria-label="Group" value={draft.group} onChange={(e) => set("group")(e.target.value)} placeholder="Group" dark={dark} />
        </div>
        <Input aria-label="Tags" value={draft.tags} onChange={(e) => set("tags")(e.target.value)} placeholder="Tags, comma separated" dark={dark} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input aria-label="Icon URL" value={draft.icon} onChange={(e) => set("icon")(e.target.value)} placeholder="Icon URL (optional)" dark={dark} />
          <Input aria-label="Screenshot URL" value={draft.screenshot} onChange={(e) => set("screenshot")(e.target.value)} placeholder="Screenshot URL (optional)" dark={dark} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose} dark={dark}>Cancel</Button>
          <Button type="submit" variant="primary" dark={dark}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
