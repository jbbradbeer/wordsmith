# Wordsmith launch kit

Everything for a Product Hunt + Show HN launch. Positioning is honest: Wordsmith
flags the AI tells in your writing and coaches you to fix them. It never rewrites
for you, and it does NOT claim to beat AI detectors. Sell craft and voice, never
evasion.

Product facts (keep copy true to these):
- Paste a draft, get a **Slop Score** (0-100, lower is better). It highlights AI
  tells (stock phrases like "delve"/"tapestry of", clichés, hedging, flat
  sentence rhythm, em-dash overuse), explains each one, and offers word-level
  alternatives. You do every rewrite.
- Two-stage: an instant rules pass, then a deeper model read (Claude).
- Drafts are never stored. Analyzed in-flight only.
- Free: 1 scan/day + 3 word searches/day (signed in). Pro: $10/mo or $96/yr,
  unlimited scans, 10,000-word drafts, and a companion home that tracks your
  score over time.
- Also a curated word/synonym search. Built solo on Next.js + Claude.
- Live at https://trywordsmith.com

---

## 1. Product Hunt

**Name:** Wordsmith

**Tagline (<= 60 chars). Primary:**
> Get your Slop Score. Sound like you, not like AI.  (49)

Alternates:
> The AI writing companion that keeps you human.  (46)
> Find the AI tells in your writing. Fix them yourself.  (52)

**Topics:** Writing, Artificial Intelligence, Productivity, Marketing

**Description (~260 chars):**
> Paste any draft and get a Slop Score. Wordsmith highlights the AI tells that
> creep into writing now: stock phrases, cliches, hedging, flat rhythm. It
> explains each one and hands you the alternatives. You do the rewriting. It
> never writes a word for you.

**Maker's first comment (post immediately on launch):**
> Hey Product Hunt. I'm the maker of Wordsmith.
>
> Here's the itch I built it for: writing that used to read as polished now reads
> as machine-made. "Delve." "A tapestry of." "It's important to note." Em-dashes
> everywhere. Every sentence the same length. You can feel it, but it's hard to
> catch in your own draft.
>
> Wordsmith gives you a Slop Score and highlights exactly what's setting off the
> alarm, with a plain-English reason for each and a better word to reach for. The
> one rule I never break: it does not rewrite anything. It points; you write. The
> whole value is that the words stay yours.
>
> A few honest notes:
> - It is not an "AI detector" and it will not help you sneak past one. It just
>   makes writing sound less generic and more like a person.
> - Your draft is never stored. It is analyzed in the moment and gone.
> - Free to try, one scan a day. Pro is $10/mo for unlimited plus a view that
>   tracks how your score improves over time.
>
> I'd genuinely love feedback, especially on the tells it misses or over-flags.
> Paste something in and tell me what you think: https://trywordsmith.com

**Gallery captions (5 assets to produce, 1270x760):**
1. Hero: a sloppy draft on the left, big red Slop Score on the right. Caption:
   "Paste a draft. Get a Slop Score."
2. Highlighted spans with one open. Caption: "Every AI tell, flagged and
   explained."
3. A span card (WHY / TRY / word alternatives). Caption: "It coaches. It never
   rewrites."
4. Companion home (score trend + streak). Caption: "Watch your writing get
   cleaner over time."
5. Before/after: score 84 to 17. Caption: "Sound like you again."

---

## 2. Show HN

HN rewards honesty, technical substance, and humility. Lead with the insight,
not the product.

**Title (<= 80 chars):**
> Show HN: Wordsmith – flags the AI tells in your writing but never rewrites it

**Body:**
> I kept noticing that "polished" writing had started to read as machine-made,
> and I wanted a tool that pointed at the tells instead of rewriting my draft for
> me (which just replaces my voice with the model's).
>
> Wordsmith gives a "Slop Score" and highlights what's driving it: stock AI
> phrases ("delve", "tapestry of", "it's important to note"), cliches, hedging
> and empty intensifiers, and flat sentence rhythm / em-dash overuse. Each flag
> has a one-line reason and a suggested word. You make every edit yourself.
>
> How it works: a deterministic rules pass runs first and returns a provisional
> score instantly (a phrase dictionary plus stats like sentence-length variance
> and em-dash density). Then one model pass (Claude) adds judgment-level spans
> like generic voice. The two merge into the score. Doing the cheap rules layer
> first means most of the signal shows up with zero latency and zero API cost.
>
> Deliberate non-features: it never generates or rewrites text, and it is not an
> AI detector (it won't help you evade one). Drafts aren't stored; analysis is
> in-flight only.
>
> Stack: Next.js on Vercel, Supabase, Claude. Solo project.
>
> It's free to try (one scan a day). I'd love feedback on the detection: what it
> misses, what it over-flags, whether the score feels right.
>
> https://trywordsmith.com

**Be ready to answer (top-comment prep):**
- *"Isn't this just a regex list?"* The rules layer is, and that's on purpose for
  the instant/free signal. The model pass catches what rules can't (generic
  voice, cliched framing). Happy to share the phrase list.
- *"How is the score computed?"* Weighted category hits normalized per ~300
  words, capped per category, mapped to 0-100. Deterministic given the same
  input. Open to critique on the weighting.
- *"Why not just ask ChatGPT to de-slop it?"* Then the output is the model's
  voice, not yours. The point is to keep you as the author.
- *"Privacy?"* Drafts are never persisted. Pro history stores scores and dates,
  never text.
- *"Does it beat detectors?"* No, and I won't pretend it does. Different problem.

---

## 3. X / Twitter launch thread

1/ Writing that used to read as polished now reads as AI. "Delve." "A tapestry
of." Em-dashes everywhere. I built a tool that catches it. Meet Wordsmith. Paste
a draft, get a Slop Score. [link]

2/ It highlights every AI tell and tells you why it's a tell, then hands you a
better word. The one thing it never does: rewrite for you. It points. You write.
The words stay yours.

3/ Two stages: an instant rules pass (stock phrases, flat rhythm, em-dash
density) gives you a score with zero wait, then a deeper read finds the generic
voice underneath.

4/ It is not an AI detector and won't help you dodge one. Different goal: sound
like a person again. Your draft is never stored.

5/ Free to try, one scan a day. Pro tracks your score over time so you can watch
your writing get cleaner. Try it, then tell me what it misses: [link]

---

## 4. Launch-day checklist

- **When:** Product Hunt Tue/Wed/Thu, 12:01am PT (posts get a full day). Show HN
  weekday morning US time (~8-10am ET). Do NOT launch both the same hour; PH
  first, HN a day or two later so you can react.
- **Before:** confirm health green (`/api/health`), Anthropic credits + spend cap
  set, uptime monitor live, 5 gallery images made, OG image renders in a link
  preview, a fresh incognito walkthrough works end to end.
- **Post the maker comment within 1 minute** of the PH listing going live.
- **Watch cost/health during the spike** (the fair-use ceilings + body caps
  protect you; the health canary + monitor alert you).
- **Reply to every comment** the first 6 hours. Ask hunters what the tool misses.
- **After:** the spike's backlinks feed the SEO engine; note the top feedback
  themes for the next build.

## 5. Reddit (soft, later)
r/writing and writing Discords hate self-promo. Don't drop a link. Share the
*insight* (a list of the AI tells you keep seeing) as a genuine post; mention the
tool only if asked. Newsletter sponsorships ($50-200 tests) once conversion from
the funnel analytics is known.
