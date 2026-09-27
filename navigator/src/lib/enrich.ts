/**
 * Site enrichment: Microlink metadata + optional OpenAI suggestions.
 * Network calls take an injectable `fetch` so they can be unit-tested.
 */
type Fetch = typeof fetch;

export type Metadata = {
  title?: string;
  description?: string;
  icon?: string;
  screenshot?: string;
  publisher?: string;
};

export type AiSuggestion = {
  shortDescription?: string;
  longDescription?: string;
  tags?: string[];
  category?: string;
  group?: string;
};

export class EnrichError extends Error {
  constructor(message: string, readonly kind: "network" | "http" | "auth" | "rate-limit" | "parse") {
    super(message);
  }
}

export const AI_MODEL = "gpt-4.1-mini";

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function request(fetchImpl: Fetch, input: string, init?: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(input, init);
  } catch {
    throw new EnrichError("Network error — check your connection.", "network");
  }
  if (res.status === 401) throw new EnrichError("API key was rejected (401).", "auth");
  if (res.status === 429) throw new EnrichError("Rate limit reached (429). Try again later.", "rate-limit");
  if (!res.ok) throw new EnrichError(`Request failed with HTTP ${res.status}.`, "http");
  try {
    return await res.json();
  } catch {
    throw new EnrichError("Response was not valid JSON.", "parse");
  }
}

const pickUrl = (v: unknown): string | undefined => {
  const url = (v as { url?: unknown } | null | undefined)?.url;
  return typeof url === "string" && url ? url : undefined;
};
const pickStr = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export async function fetchMetadata(url: string, opts: { screenshot?: boolean; fetchImpl?: Fetch } = {}): Promise<Metadata> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const qs = `url=${encodeURIComponent(url)}&meta=true${opts.screenshot ? "&screenshot=true" : ""}`;
  const json = (await request(fetchImpl, `https://api.microlink.io/?${qs}`)) as { status?: string; data?: Record<string, unknown> };
  if (json?.status && json.status !== "success") throw new EnrichError(`Metadata service returned "${json.status}".`, "http");
  const d = json?.data ?? {};
  return {
    title: pickStr(d.title),
    description: pickStr(d.description),
    icon: pickUrl(d.logo),
    screenshot: pickUrl(d.screenshot) ?? pickUrl(d.image),
    publisher: pickStr(d.publisher),
  };
}

/**
 * Extracts the model text from a Responses API payload. `output_text` is a convenience
 * field added by the official SDKs; raw HTTP responses carry the text inside
 * `output[].content[]` items of type "output_text", so both shapes are handled.
 */
export function extractOutputText(json: unknown): string {
  const j = json as { output_text?: unknown; output?: unknown };
  if (typeof j?.output_text === "string") return j.output_text;
  if (!Array.isArray(j?.output)) return "";
  const parts: string[] = [];
  for (const item of j.output as { content?: unknown }[]) {
    if (!Array.isArray(item?.content)) continue;
    for (const c of item.content as { type?: string; text?: unknown }[]) {
      if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text);
    }
  }
  return parts.join("");
}

export function parseAiSuggestion(text: string): AiSuggestion {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new EnrichError("AI answer was not valid JSON.", "parse");
  }
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.filter((t): t is string => typeof t === "string" && !!t.trim()).map((t) => t.trim().toLowerCase()).slice(0, 8)
    : undefined;
  return {
    shortDescription: pickStr(parsed.shortDescription),
    longDescription: pickStr(parsed.longDescription),
    tags: tags?.length ? tags : undefined,
    category: pickStr(parsed.category),
    group: pickStr(parsed.group),
  };
}

export async function aiEnrich(
  apiKey: string,
  input: { url: string; title?: string; description?: string },
  fetchImpl: Fetch = fetch,
): Promise<AiSuggestion> {
  const json = await request(fetchImpl, "https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: AI_MODEL,
      input: [
        {
          role: "system",
          content:
            "Return JSON only (no markdown) with keys shortDescription, longDescription, tags (array of lowercase strings), category, group. Keep wording concise.",
        },
        { role: "user", content: `URL: ${input.url}\nTitle: ${input.title ?? ""}\nDescription: ${input.description ?? ""}` },
      ],
    }),
  });
  return parseAiSuggestion(extractOutputText(json));
}
