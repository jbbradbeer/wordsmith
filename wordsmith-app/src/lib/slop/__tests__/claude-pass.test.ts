import { describe, it, expect } from "vitest";
import { parseClaudeSpans } from "../claude-pass";

const TEXT = "Our solution empowers teams. It is a comprehensive platform for growth.";

describe("parseClaudeSpans", () => {
  it("maps quoted excerpts to exact offsets", () => {
    const raw = JSON.stringify([
      { quote: "a comprehensive platform for growth", category: "generic-voice", why: "Says nothing specific.", hint: "Name what it does." },
    ]);
    const spans = parseClaudeSpans(raw, TEXT);
    expect(spans).toHaveLength(1);
    expect(TEXT.slice(spans[0].start, spans[0].end)).toBe("a comprehensive platform for growth");
    expect(spans[0].source).toBe("claude");
  });

  it("drops quotes not found in the text and unknown categories", () => {
    const raw = JSON.stringify([
      { quote: "not present anywhere", category: "generic-voice", why: "x", hint: "y" },
      { quote: "empowers teams", category: "bogus-category", why: "x", hint: "y" },
    ]);
    expect(parseClaudeSpans(raw, TEXT)).toHaveLength(0);
  });

  it("returns [] on malformed JSON", () => {
    expect(parseClaudeSpans("not json {", TEXT)).toEqual([]);
  });

  it("strips markdown fences if present", () => {
    const raw = '```json\n[{"quote":"empowers teams","category":"cliche","why":"w","hint":"h"}]\n```';
    expect(parseClaudeSpans(raw, TEXT)).toHaveLength(1);
  });
});
