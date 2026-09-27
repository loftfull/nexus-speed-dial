import { describe, expect, it } from "vitest";
import { EnrichError, aiEnrich, extractOutputText, fetchMetadata, normalizeUrl, parseAiSuggestion } from "../enrich";

const respond = (status: number, body: unknown) =>
  (async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("normalizeUrl", () => {
  it("adds https only when no scheme is present", () => {
    expect(normalizeUrl(" example.com ")).toBe("https://example.com");
    expect(normalizeUrl("http://x.dev")).toBe("http://x.dev");
    expect(normalizeUrl("HTTPS://x.dev")).toBe("HTTPS://x.dev");
  });
});

describe("fetchMetadata", () => {
  it("maps Microlink fields, preferring the screenshot over the og:image", async () => {
    const meta = await fetchMetadata("https://a.dev", {
      fetchImpl: respond(200, { status: "success", data: { title: "A", logo: { url: "L" }, image: { url: "I" }, screenshot: { url: "S" }, publisher: "Pub" } }),
    });
    expect(meta).toEqual({ title: "A", description: undefined, icon: "L", screenshot: "S", publisher: "Pub" });
  });

  it("throws typed errors for HTTP failures (2.0 ignored response.ok)", async () => {
    await expect(fetchMetadata("https://a.dev", { fetchImpl: respond(500, {}) })).rejects.toMatchObject({ kind: "http" });
    await expect(fetchMetadata("https://a.dev", { fetchImpl: respond(429, {}) })).rejects.toMatchObject({ kind: "rate-limit" });
    const offline = (async () => { throw new TypeError("Failed to fetch"); }) as unknown as typeof fetch;
    await expect(fetchMetadata("https://a.dev", { fetchImpl: offline })).rejects.toBeInstanceOf(EnrichError);
  });
});

describe("OpenAI Responses parsing", () => {
  const payload = { shortDescription: "Short", tags: ["Dev", " AI ", 3], category: "Eng" };

  it("reads text from the raw output[] structure", () => {
    const raw = { output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(payload) }] }] };
    expect(extractOutputText(raw)).toBe(JSON.stringify(payload));
  });

  it("prefers the SDK-style output_text when present", () => {
    expect(extractOutputText({ output_text: "x", output: [] })).toBe("x");
  });

  it("parses fenced JSON and normalizes tags", () => {
    const s = parseAiSuggestion("```json\n" + JSON.stringify(payload) + "\n```");
    expect(s).toEqual({ shortDescription: "Short", longDescription: undefined, tags: ["dev", "ai"], category: "Eng", group: undefined });
  });

  it("rejects non-JSON answers", () => {
    expect(() => parseAiSuggestion("Sure! Here you go")).toThrow(EnrichError);
  });

  it("maps 401 to an auth error", async () => {
    await expect(aiEnrich("sk-bad", { url: "https://a.dev" }, respond(401, { error: {} }))).rejects.toMatchObject({ kind: "auth" });
  });
});
