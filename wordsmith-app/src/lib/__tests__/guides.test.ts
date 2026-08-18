import { describe, it, expect } from "vitest";
import { GUIDES, getGuide, isGuidePublished, GUIDE_TODO_MARKER } from "../guides";

describe("guides", () => {
  it("have unique slugs and sub-60-char titles", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const g of GUIDES) {
      expect(g.title.length).toBeLessThanOrEqual(60);
    }
  });

  it("getGuide resolves by slug", () => {
    expect(getGuide("ai-words-to-avoid")?.targetKeyword).toBe("ai words to avoid");
    expect(getGuide("nope")).toBeUndefined();
  });

  it("scaffolded guides are unpublished until every TODO brief is replaced", () => {
    // All four ship as briefs — none may be published (i.e. indexable) yet.
    for (const g of GUIDES) {
      expect(isGuidePublished(g)).toBe(false);
    }
    const done = {
      ...GUIDES[0],
      intro: "Real intro.",
      sections: GUIDES[0].sections.map((s) => ({ ...s, body: "Real copy." })),
    };
    expect(isGuidePublished(done)).toBe(true);
    expect(done.intro).not.toContain(GUIDE_TODO_MARKER);
  });
});
