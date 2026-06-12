/** Shared prompt for word alternatives — used by live search and page generation. */
export function buildWordPrompt(searchTerm: string): string {
  return `I'm looking for alternative, more interesting words for: "${searchTerm}"

Return ONLY 6 lines of NDJSON. Each line must be a complete, self-contained JSON object.
No arrays, no wrapper, no markdown, no preamble. One object per line:

{"word":"...","pronunciation":"...","definition":"...","example":"...","context":"...","category":"..."}

Rules:
- Each line is valid JSON on its own
- "category" must be one of: elevated, literary, punchy, rare
- "pronunciation" uses phonetic notation like /fə-ˈnɛt-ɪk/
- "definition" is one crisp sentence
- "example" is a vivid sentence using the word naturally
- "context" is a brief note on when/where this word works best
- Give 6 alternatives ranging from slightly sophisticated to truly rare/unusual
- Output exactly 6 lines, nothing else`;
}
