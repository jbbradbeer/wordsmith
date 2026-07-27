# Unified Platform Flow — Design Spec

**Date:** 2026-07-26
**Goal:** Make Wordsmith read as one writing-companion/learning platform instead of a set of disjointed pages, by giving it a single shared navigation shell, one front door, and consistent naming across every page.

## Problem (current state)

Audited via IA map of all pages. Findings:

1. **No shared navigation.** `_app.tsx`/`_document.tsx` render no nav or footer wrapper. Every page hand-rolls its own `<nav>` — 8 distinct header implementations with different link sets.
2. **Two competing front doors.** Both `/` (index.tsx, sells the Slop Score analyzer) and `/search` (search.tsx, whose component is literally named `Home`) are full marketing landings with hero/how-it-works/features/pricing/CTA.
3. **Naming collisions.** Nav link "Slop Score" → `/`; "Account" → `/search`; "Search" → `/`; the search tool is variously "Word Search" / "Search" / "Find Words".
4. **Content/SEO pages dead-end.** `/words`, `/words/[word]`, `/synonyms-for/[word]`, `/words/category/[slug]`, `/score` have only a breadcrumb or eyebrow — no site nav. A search visitor cannot reach the rest of the platform.
5. **Collections reachable from one place** — the `/search` nav only (paid-gated). Not in the footer or any other nav.
6. **`/privacy` is the odd page out** — the only page not using the shared `Footer`, logo-only nav, inline styles.

## Decisions (locked with user)

- **Spine:** one shared app shell — a single persistent nav on every page. `/` is the only marketing landing.
- **Nav is flat** (no dropdown): `Wordsmith(logo) · Analyze · Word Search · Word Library · Collections · account`.
- **Content/SEO pages** get the shell too, in a **lean variant** (logo + main links + one CTA; no UsageBar/Manage clutter). Breadcrumb stays below it.
- **`/search`** stops being a second marketing landing; becomes purely the Word Search tool inside the shell.
- Testimonials section already removed (fabricated placeholder) — done prior to this spec.

## Architecture

### `src/components/nav/SiteNav.tsx` (new — the one nav)
A single component with a `variant` prop:

- `variant="full"` — used on `/`, `/search`, `/collections`.
- `variant="lean"` — used on `/words`, `/words/[word]`, `/synonyms-for/[word]`, `/words/category/[slug]`, `/score`, `/privacy`.

Props:
```ts
type SiteNavProps = { variant: "full" | "lean" };
```
Behavior:
- Sticky top bar. Logo "Wordsmith" → `/`.
- Primary links (both variants): **Analyze** → `/`, **Word Search** → `/search`, **Word Library** → `/words`.
- Active-link highlight computed from `router.pathname` via the pure helper below.
- **Full variant, signed out:** `Sign in` (opens AuthModal, owned by the shell) + `Get started free` (opens AuthModal in signup mode).
- **Full variant, signed in:** `Collections` → `/collections`, compact `UsageBar`, `Manage billing` (Stripe portal via existing `/api/portal` flow), `Sign out`. Show an `Upgrade` affordance when the user is on the free tier (reuse existing PaywallModal trigger or link to pricing on `/`).
- **Lean variant:** primary links + a single CTA — `Get started free` when signed out, a compact account/`Go to app` link when signed in. No UsageBar, no Manage.
- **Mobile:** hamburger toggling a menu panel — focus trap, Escape to close, `aria-expanded`/`aria-controls`, `overscroll-behavior: contain`, restores focus to the toggle on close. Reuse the interaction pattern from the existing shared `Modal.tsx` where practical.
- **Hydration-safe account slot:** session state is `undefined` on first client render; render a fixed-size skeleton placeholder in the account slot until session resolves, so there is no layout shift and no hydration mismatch.
- Honors `prefers-reduced-motion` for any open/close transition (transform/opacity only).

### `src/lib/nav-config.ts` (new — pure, testable)
```ts
export type NavItem = { label: string; href: string };
export const PRIMARY_NAV: NavItem[] = [
  { label: "Analyze", href: "/" },
  { label: "Word Search", href: "/search" },
  { label: "Word Library", href: "/words" },
];
// Returns the href of the active primary item for a given pathname, or null.
export function activeNavHref(pathname: string): string | null;
```
`activeNavHref` maps a pathname to the owning primary section:
- `/` → `/`
- `/search` → `/search`
- `/words`, `/words/[word]`, `/synonyms-for/[word]`, `/words/category/[slug]` → `/words`
- anything else (`/collections`, `/score`, `/privacy`) → null (no primary highlighted).

### Layout wiring (`_app.tsx` + per-page `getLayout`)
Use the Next.js pages-router per-page-layout pattern:
- Define `NextPageWithLayout` type; `_app.tsx` calls `Component.getLayout?.(page) ?? page`.
- A `getLayout` factory `withShell(variant)` wraps a page in `<SiteNav variant/> {page} <Footer/>`.
- Each page exports `MyPage.getLayout = withShell("full"|"lean")`.
- Pages keep their own breadcrumb (rendered inside the page body, below the nav). Pages remove their hand-rolled `<nav>` and their own `<Footer>` render (the layout supplies it).

The AuthModal that the full-variant nav opens is owned by SiteNav (single instance), so pages no longer each mount their own sign-in modal solely for the nav. Pages that use AuthModal/PaywallModal for their own in-body flows (index analyzer paywall, search paywall) keep those as needed; the nav's sign-in path is self-contained.

## Naming canon (applied everywhere)

| Concept | Canonical | Kill |
|---|---|---|
| The metric | "Slop Score" (text only, never a link target) | "Slop Score" nav link → `/` |
| The analyzer / home | nav label **"Analyze"** → `/` (logo also → `/`) | — |
| The search tool | **"Word Search"** → `/search` (button "Find Words" ok) | "Search" → `/`, "Account" → `/search` |
| The browse hub | **"Word Library"** → `/words` | — |
| Saved words | **"Collections"** → `/collections` | — |
| Billing | **"Manage billing"** (Stripe portal) | fake "Account" link |

Footer (`src/components/landing/Footer.tsx`) relabeled to match and gains a **Collections** link: Analyze(`/`), Word Search(`/search`), Word Library(`/words`), Collections(`/collections`), Privacy(`/privacy`), Contact(mailto). Keep the fleuron easter-egg button.

## `/search` de-landing

Remove from `search.tsx`: `Hero`, `HowItWorks` (landing), `FeaturesSection`, `PricingSection`, `CtaSection`, `WordMarquee` imports + renders (the `showLandingSections` block). Keep: the search box, results (`WordCard`/SSE), starter words, `SocialProofBar` (feature claims — kept as a slim strip under the search box), `WordRain` easter egg, `UsageBar`, `AuthModal`, `PaywallModal`. Add a one-line explainer + a "Browse the Word Library" cross-link so the tool page stands alone.

Now-unused `landing/*` components (`Hero`, `FeaturesSection`, `PricingSection`, `CtaSection`, landing `HowItWorks`, `WordMarquee`) are deleted. `Footer`, `SocialProofBar`, `Reveal`, `MagneticButton` are retained (still referenced by `/search` or `home/*`); verify importers before each delete and only delete files with zero importers. Do NOT delete shared globals.css classes.

## Content pages + `/privacy` + `/score`

- `/words`, `/words/[word]`, `/synonyms-for/[word]`, `/words/category/[slug]`: `getLayout = withShell("lean")`; remove eyebrow/duplicate logo; keep breadcrumb.
- `/score`: `getLayout = withShell("lean")`; keep the share card.
- `/privacy`: `getLayout = withShell("lean")`; drop its inline nav + inline back-link; now uses shared Footer. (Inline-style → Tailwind conversion is optional polish, not required by this spec.)

## Error handling / states

- Session loading → skeleton account slot (no CLS, no hydration mismatch).
- Mobile menu: focus trap, Escape, restore focus, `aria-*`, `overscroll-behavior: contain`.
- Active link uses `aria-current="page"`.
- Reduced-motion respected.
- Sign-out and portal errors surface inline (no silent failure), consistent with the WIG pass.

## Testing

- **Unit (vitest):** `nav-config.ts` — `activeNavHref` for each route family (`/`, `/search`, `/words`, `/words/x`, `/synonyms-for/x`, `/words/category/x`, `/collections`, `/score`, `/privacy`); `PRIMARY_NAV` shape.
- **Component smoke (RTL if available in repo, else skip):** SiteNav renders correct link set per variant + signed-in/out state.
- **Manual:** dev server visual pass across all page types at desktop + mobile widths (user reviews screens; no browser automation).
- **Build/verify:** `tsc --noEmit`, `vitest run`, `next build` (page-data step needs real env; compile+lint is the local gate).

## Out of scope (explicitly deferred)

- Nested-interactive card refactor (WordCard/CollectionCard `role="button"` wrapping real buttons) — tracked separately.
- Any visual restyle beyond adopting the shared shell (colors, type, spacing unchanged).
- A real `/account` page (billing stays the Stripe portal).
- `landing/*` animation-property cleanup (blur/background-position) — low priority, reduced-motion-safe globally.
