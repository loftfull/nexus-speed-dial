import { FormEvent, useEffect, useState } from "react";
import { Site } from "../types";
import { useBaseDraft } from "../utils/helpers";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

type Draft = {
  title: string;
  url: string;
  description: string;
  longDescription: string;
  project: string;
  category: string;
  group: string;
  tags: string;
  icon: string;
  screenshot: string;
};

export function AddSiteModal({
  open,
  onClose,
  onSave,
  aiApiKey,
  defaultProject,
  defaultCategory,
  defaultGroup,
  dark,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (site: Omit<Site, "id" | "extractedAt" | "favorite" | "visits" | "order">) => void;
  aiApiKey: string;
  defaultProject: string;
  defaultCategory: string;
  defaultGroup: string;
  dark?: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(() => useBaseDraft(defaultProject, defaultCategory, defaultGroup));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(useBaseDraft(defaultProject, defaultCategory, defaultGroup));
      setError("");
    }
  }, [open, defaultProject, defaultCategory, defaultGroup]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.url.trim()) return;

    const normalizedUrl = draft.url.startsWith("http") ? draft.url : `https://${draft.url}`;
    onSave({
      title: draft.title.trim(),
      url: normalizedUrl,
      description: draft.description.trim(),
      longDescription: draft.longDescription.trim() || undefined,
      project: draft.project.trim() || "General",
      category: draft.category.trim() || "General",
      group: draft.group.trim() || "General",
      tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      icon: draft.icon.trim() || undefined,
      screenshot: draft.screenshot.trim() || undefined,
    });
    onClose();
  };

  const autofillFromUrl = async () => {
    const rawUrl = draft.url.trim();
    if (!rawUrl) return;
    const normalizedUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    setLoading(true);
    setError("");

    try {
      const metadataResponse = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(normalizedUrl)}&screenshot=true&meta=true`);
      const metadataJson = await metadataResponse.json();
      const data = metadataJson?.data ?? {};

      setDraft((prev) => ({
        ...prev,
        url: normalizedUrl,
        title: prev.title || data.title || "",
        description: prev.description || data.description || "",
        longDescription: prev.longDescription || data.description || "",
        icon: prev.icon || data.logo?.url || "",
        screenshot: prev.screenshot || data.image?.url || "",
        project: prev.project || (defaultProject !== "All projects" ? defaultProject : "Work"),
        category: prev.category || (defaultCategory !== "All categories" ? defaultCategory : data.publisher || "General"),
        group: prev.group || (defaultGroup !== "All groups" ? defaultGroup : "General"),
      }));

      if (aiApiKey) {
        const aiResponse = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            input: [
              {
                role: "system",
                content:
                  "Return JSON only with keys shortDescription,longDescription,tags,category,group. Keep wording concise.",
              },
              {
                role: "user",
                content: `URL: ${normalizedUrl}\nTitle: ${data.title || ""}\nDescription: ${data.description || ""}`,
              },
            ],
          }),
        });

        const aiJson = await aiResponse.json();
        const output = aiJson?.output_text ?? "";
        try {
          const parsed = JSON.parse(output);
          setDraft((prev) => ({
            ...prev,
            description: prev.description || parsed.shortDescription || "",
            longDescription: prev.longDescription || parsed.longDescription || "",
            tags: prev.tags || (Array.isArray(parsed.tags) ? parsed.tags.join(", ") : ""),
            category: prev.category || parsed.category || prev.category,
            group: prev.group || parsed.group || prev.group,
          }));
        } catch {
          // keep metadata-only autofill
        }
      }
    } catch {
      setError("Failed to fetch metadata for this URL.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} dark={dark}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <h2 className="text-base font-bold">Add Site</h2>
        <div className="flex gap-2">
          <Input value={draft.url} onChange={(e) => setDraft((prev) => ({ ...prev, url: e.target.value }))} placeholder="https://example.com" className="flex-1" dark={dark} />
          <Button type="button" onClick={autofillFromUrl} variant="outline" loading={loading} dark={dark}>Auto fill</Button>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <Input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" dark={dark} />
        <Input value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} placeholder="Short description" dark={dark} />
        <textarea value={draft.longDescription} onChange={(e) => setDraft((prev) => ({ ...prev, longDescription: e.target.value }))} placeholder="Detailed description" className={`min-h-24 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${dark ? "border-slate-700 bg-slate-900/80 text-slate-100" : "border-slate-200 bg-white"}`} />
        <div className="grid grid-cols-3 gap-2">
          <Input value={draft.project} onChange={(e) => setDraft((prev) => ({ ...prev, project: e.target.value }))} placeholder="Project" dark={dark} />
          <Input value={draft.category} onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))} placeholder="Category" dark={dark} />
          <Input value={draft.group} onChange={(e) => setDraft((prev) => ({ ...prev, group: e.target.value }))} placeholder="Group" dark={dark} />
        </div>
        <Input value={draft.tags} onChange={(e) => setDraft((prev) => ({ ...prev, tags: e.target.value }))} placeholder="Tags, comma separated" dark={dark} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose} variant="outline" dark={dark}>Cancel</Button>
          <Button type="submit" variant="primary" dark={dark}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
