import { describe, expect, it } from "vitest";
import { ON_ACCENT, accents, cardBackground, contrast, domainHue, monogramColors, palettes } from "../theme";

const AA_TEXT = 4.5;
const AA_GRAPHIC = 3;

describe("contrast()", () => {
  it("matches the WCAG reference values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // #767676 on white is the well-known 4.54:1 AA boundary grey.
    expect(contrast("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});

describe.each(Object.entries(palettes))("palette %s", (_name, p) => {
  const surfaces = { canvas: p.canvas, card: cardBackground(p), white: p.surface };
  it.each(Object.entries(surfaces))("text tokens reach AA on %s", (_s, bg) => {
    expect(contrast(p.fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(p.muted, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(p.subtle, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(p.star, bg)).toBeGreaterThanOrEqual(AA_GRAPHIC);
  });
});

describe.each(Object.entries(accents))("accent %s", (_name, a) => {
  const light = palettes.macLight;
  it("white text on the accent button reaches AA", () => {
    expect(contrast(ON_ACCENT, a.base)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(ON_ACCENT, a.strong)).toBeGreaterThanOrEqual(AA_TEXT);
  });
  it("accent text reaches AA on light surfaces", () => {
    for (const bg of [light.canvas, cardBackground(light), a.soft, "#ffffff"]) {
      expect(contrast(a.strong, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
  it("accent text reaches AA on the night canvas", () => {
    expect(contrast(a.onDark, palettes.macNight.canvas)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe("monogram fallback", () => {
  it("is deterministic per domain", () => {
    expect(domainHue("github.com")).toBe(domainHue("github.com"));
    expect(domainHue("github.com")).not.toBe(domainHue("figma.com"));
  });
  it("reaches AA for every hue", () => {
    for (let h = 0; h < 360; h++) {
      const { bgRgb, fgRgb } = monogramColors(h);
      expect(contrast(fgRgb, bgRgb), `hue ${h}`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});
