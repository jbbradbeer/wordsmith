import { describe, it, expect } from "vitest";
import { PRIMARY_NAV, activeNavHref } from "../nav-config";

describe("nav-config", () => {
  it("PRIMARY_NAV is Analyze, Word Search, Word Library in order", () => {
    expect(PRIMARY_NAV).toEqual([
      { label: "Analyze", href: "/" },
      { label: "Word Search", href: "/search" },
      { label: "Word Library", href: "/words" },
    ]);
  });

  it("maps home", () => expect(activeNavHref("/")).toBe("/"));
  it("maps search", () => expect(activeNavHref("/search")).toBe("/search"));
  it("maps words index", () => expect(activeNavHref("/words")).toBe("/words"));
  it("maps a word page to words", () =>
    expect(activeNavHref("/words/[word]")).toBe("/words"));
  it("maps synonyms page to words", () =>
    expect(activeNavHref("/synonyms-for/[word]")).toBe("/words"));
  it("maps category page to words", () =>
    expect(activeNavHref("/words/category/[slug]")).toBe("/words"));
  it("returns null for collections", () =>
    expect(activeNavHref("/collections")).toBeNull());
  it("returns null for score", () => expect(activeNavHref("/score")).toBeNull());
  it("returns null for privacy", () =>
    expect(activeNavHref("/privacy")).toBeNull());
});
