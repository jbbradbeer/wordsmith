// src/lib/slop/slop-phrases.ts
import type { SlopCategory } from "./types";

export interface PhraseEntry {
  phrase: string; // lowercase; matched on word boundaries, case-insensitive
  category: SlopCategory;
  why: string;
  hint: string;
}

const AIISM = (phrase: string, hint: string): PhraseEntry => ({
  phrase, category: "ai-ism",
  why: "Stock AI phrasing. Readers now recognize it as machine-generated filler.",
  hint,
});
const HEDGE = (phrase: string): PhraseEntry => ({
  phrase, category: "hedging",
  why: "Boilerplate qualifier that weakens the sentence without adding information.",
  hint: "Commit to the claim or cut the sentence.",
});
const INT = (phrase: string): PhraseEntry => ({
  phrase, category: "intensifier",
  why: "Empty intensity. It asserts strength instead of showing it.",
  hint: "Delete it, or replace the whole phrase with a specific detail.",
});
const TRANS = (phrase: string): PhraseEntry => ({
  phrase, category: "transition",
  why: "Stock connective. Overuse flattens your paragraph rhythm.",
  hint: "Cut it, or connect the ideas with content instead of a signpost.",
});
const CLICHE = (phrase: string, hint: string): PhraseEntry => ({
  phrase, category: "cliche",
  why: "Tired figurative framing. It was vivid once, now it is wallpaper.",
  hint,
});

export const SLOP_PHRASES: PhraseEntry[] = [
  AIISM("delve into", "Say what you actually do: examine, unpack, measure."),
  AIISM("delves into", "Say what it actually does: examines, unpacks, measures."),
  AIISM("tapestry of", "Name the actual parts instead of the weave."),
  AIISM("it's important to note that", "Just state the point. Importance shows itself."),
  AIISM("it is important to note that", "Just state the point. Importance shows itself."),
  AIISM("it's worth noting that", "Just state the point."),
  AIISM("in today's fast-paced world", "Cut the throat-clearing; start with your claim."),
  AIISM("in the ever-evolving landscape", "Name the specific change you mean."),
  AIISM("in the realm of", "Name the field plainly or cut it."),
  AIISM("game-changer", "Say what changed and by how much."),
  AIISM("game changer", "Say what changed and by how much."),
  AIISM("unlock the power of", "Say what the reader can now do."),
  AIISM("unleash the potential", "Say what the reader can now do."),
  AIISM("elevate your", "Name the concrete improvement."),
  AIISM("take it to the next level", "Name the level: faster, cheaper, clearer?"),
  AIISM("seamlessly integrates", "Describe how the pieces actually connect."),
  AIISM("a testament to", "Show the evidence instead of labeling it."),
  AIISM("navigate the complexities", "Name one complexity and how you handle it."),
  AIISM("harness the power", "Say what you do with it."),
  AIISM("dive deep into", "Say what you examine and what you found."),
  AIISM("deep dive", "Name what you examined and what you found."),
  AIISM("robust solution", "Robust how? Survives what failure?"),
  AIISM("cutting-edge", "Name the technique. 'New' is not a feature."),
  AIISM("state-of-the-art", "Name the technique and the benchmark."),
  AIISM("revolutionize", "Say what becomes possible that wasn't."),
  AIISM("empower you to", "Say what the reader can now do, plainly."),
  AIISM("at the end of the day", "Cut it; give the conclusion directly."),
  AIISM("look no further", "Cut the infomercial beat."),
  AIISM("in conclusion", "End with your strongest point, not a label."),
  AIISM("furthermore, it", "Vary the connective or fuse the sentences."),
  HEDGE("it could be argued that"),
  HEDGE("some might say"),
  HEDGE("arguably"),
  HEDGE("to some extent"),
  HEDGE("in many ways"),
  HEDGE("generally speaking"),
  INT("very"),
  INT("really"),
  INT("truly"),
  INT("incredibly"),
  INT("extremely"),
  INT("absolutely"),
  TRANS("moreover"),
  TRANS("furthermore"),
  TRANS("additionally"),
  TRANS("in addition"),
  TRANS("on the other hand"),
  CLICHE("double-edged sword", "Name both edges explicitly instead."),
  CLICHE("tip of the iceberg", "Quantify what is below the surface."),
  CLICHE("think outside the box", "Describe the unconventional idea itself."),
  CLICHE("low-hanging fruit", "Name the easy win concretely."),
  CLICHE("move the needle", "Which metric, moved how far?"),
  CLICHE("paradigm shift", "Describe the before and after plainly."),
];
