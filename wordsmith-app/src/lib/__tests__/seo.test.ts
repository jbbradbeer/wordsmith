import { describe, it, expect } from "vitest";
import { jsonLdSerialize } from "../seo";

describe("jsonLdSerialize", () => {
  it("serializes plain data identically to JSON.stringify", () => {
    const data = { "@type": "Thing", name: "word", count: 3 };
    expect(JSON.parse(jsonLdSerialize(data))).toEqual(data);
  });

  it("escapes </script> so it cannot close the tag", () => {
    const out = jsonLdSerialize({ description: 'x</script><script>alert(1)</script>' });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
  });

  it("escapes ampersands and line separators", () => {
    const out = jsonLdSerialize({ d: "a&b\u2028c\u2029d" });
    expect(out).not.toContain("&");
    expect(out).not.toContain("\u2028");
    expect(out).not.toContain("\u2029");
  });

  it("round-trips escaped content back to the original", () => {
    const data = { d: 'quote " backslash \\ tag </script> amp & sep  ' };
    expect(JSON.parse(jsonLdSerialize(data))).toEqual(data);
  });
});
