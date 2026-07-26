# Unified Platform Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Wordsmith a single shared navigation shell and one front door so it reads as one platform, replacing 8 hand-rolled page navs.

**Architecture:** A pure `nav-config.ts` helper + one `SiteNav` component (full/lean variants) wired through the Next.js pages-router per-page `getLayout` pattern in `_app.tsx`. Each page declares its variant, drops its bespoke `<nav>`/`<Footer>`, and the layout supplies nav + `<main id="main-content">` + `Footer` + the site-wide easter egg. `/search` loses its duplicate marketing landing.

**Tech Stack:** Next.js 14 (pages router), React 18, TypeScript, Tailwind, `@supabase/auth-helpers-react`, vitest.

## Global Constraints

- Branch `feat/unified-platform-flow` already exists and is checked out. Work there. Do NOT touch `main`.
- Repo working dir for all commands: `repo/wordsmith-app` (relative to git root `repo/`). Paths below are relative to `repo/wordsmith-app` unless noted.
- ZERO em-dashes in any user-facing copy (product de-slops writing; em-dash is the tell). Use periods or commas.
- Naming canon (use these exact labels + hrefs everywhere): **Analyze** → `/`, **Word Search** → `/search`, **Word Library** → `/words`, **Collections** → `/collections`, **Manage billing** (Stripe portal), logo **Wordsmith** → `/`. "Slop Score" is the metric name only, never a nav link. Never label a link "Account" or "Search".
- Tailwind + existing color tokens only (`parchment-*`, `gold`); no new colors, no restyle beyond adopting the shell.
- `next build`'s page-data step fails locally because `.env.local` is an empty template (`supabaseUrl is required`) — this is pre-existing and NOT a regression. The local gate is `npx tsc --noEmit` + `npx vitest run` + `next build` reaching "Compiled successfully" (compile + lint pass).
- Do NOT delete shared `globals.css` classes. Verify zero importers before deleting any component file.
- Do NOT start a dev server as a foreground command.

---

## File Structure

- `src/lib/nav-config.ts` (new) — pure nav data + `activeNavHref(pathname)`. One responsibility: route→active-section mapping. Unit-tested.
- `src/lib/__tests__/nav-config.test.ts` (new) — tests for the above.
- `src/components/nav/SiteNav.tsx` (new) — the one nav bar (full + lean variants); owns its auth/paywall/portal/sign-out + mobile menu.
- `src/components/nav/ShellLayout.tsx` (new) — `withShell(variant)` getLayout factory; renders skip-link + SiteNav + `<main id="main-content">` + Footer + site-wide WordRain easter egg.
- `src/pages/_app.tsx` (modify) — `NextPageWithLayout` types; render `Component.getLayout`.
- `src/components/landing/Footer.tsx` (modify) — relabel to naming canon + add Collections link.
- Page files (modify): `index.tsx`, `search.tsx`, `collections.tsx`, `words/index.tsx`, `words/[word].tsx`, `synonyms-for/[word].tsx`, `words/category/[slug].tsx`, `score.tsx`, `privacy.tsx` — drop bespoke nav/footer/main, add `getLayout`.
- Delete (after zero-importer check): `src/components/landing/{Hero,FeaturesSection,PricingSection,CtaSection,HowItWorks,WordMarquee}.tsx`.

---

## Task 1: `nav-config.ts` pure helper

**Files:**
- Create: `src/lib/nav-config.ts`
- Test: `src/lib/__tests__/nav-config.test.ts`

**Interfaces:**
- Produces: `type NavItem = { label: string; href: string }`; `export const PRIMARY_NAV: NavItem[]`; `export function activeNavHref(pathname: string): string | null`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/nav-config.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/nav-config.test.ts`
Expected: FAIL — cannot find module `../nav-config`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/nav-config.ts`:
```ts
export type NavItem = { label: string; href: string };

export const PRIMARY_NAV: NavItem[] = [
  { label: "Analyze", href: "/" },
  { label: "Word Search", href: "/search" },
  { label: "Word Library", href: "/words" },
];

/**
 * The href of the active primary nav item for a given Next.js router pathname
 * (use `router.pathname`, which is the route template e.g. "/words/[word]").
 * Returns null when no primary section owns the route.
 */
export function activeNavHref(pathname: string): string | null {
  if (pathname === "/") return "/";
  if (pathname === "/search") return "/search";
  if (
    pathname === "/words" ||
    pathname.startsWith("/words/") ||
    pathname.startsWith("/synonyms-for")
  ) {
    return "/words";
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/nav-config.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav-config.ts src/lib/__tests__/nav-config.test.ts
git commit -m "feat(nav): pure nav-config helper (PRIMARY_NAV + activeNavHref)"
```

---

## Task 2: `SiteNav` component

**Files:**
- Create: `src/components/nav/SiteNav.tsx`

**Interfaces:**
- Consumes: `PRIMARY_NAV`, `activeNavHref` (Task 1); `useUserInfo()` from `@/lib/use-user-info` returning `{ userInfo, setUserInfo, session }` where `userInfo` is `{ searchCount: number; isPaid: boolean } | null`; `UsageBar` props `{ searchCount, isPaid, onUpgrade }`; `AuthModal` props `{ isOpen, onClose, initialMode }`; `PaywallModal` props `{ isOpen, onClose }`.
- Produces: `export default function SiteNav({ variant }: { variant: "full" | "lean" })`.

There is no React Testing Library setup in this repo (all tests are pure `src/lib/__tests__/*`), so this component is verified by `tsc` + the visual pass in Task 9, not a unit test.

- [ ] **Step 1: Write the component**

Create `src/components/nav/SiteNav.tsx`:
```tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useUserInfo } from "@/lib/use-user-info";
import { PRIMARY_NAV, activeNavHref } from "@/lib/nav-config";
import UsageBar from "@/components/UsageBar";
import AuthModal from "@/components/AuthModal";
import PaywallModal from "@/components/PaywallModal";

type Variant = "full" | "lean";

export default function SiteNav({ variant }: { variant: Variant }) {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { userInfo, setUserInfo, session } = useUserInfo();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const active = activeNavHref(router.pathname);
  const isPaid = !!userInfo?.isPaid;

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setMenuOpen(false);
  };

  const handleManage = async () => {
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else console.error("portal: no url in response");
    } catch (e) {
      console.error("portal error", e);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserInfo(null);
    setMenuOpen(false);
    router.push("/");
  };

  // Close the mobile menu on navigation + on Escape.
  useEffect(() => {
    const close = () => setMenuOpen(false);
    router.events.on("routeChangeStart", close);
    return () => router.events.off("routeChangeStart", close);
  }, [router.events]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const linkBase =
    "footer-link font-body text-sm text-parchment-700 no-underline";
  const primaryLinks = PRIMARY_NAV.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={active === item.href ? "page" : undefined}
      className={`${linkBase} ${
        active === item.href ? "text-parchment-900 font-semibold" : ""
      }`}
    >
      {item.label}
    </Link>
  ));

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-white focus:text-parchment-900 focus:px-4 focus:py-2 focus:rounded-lg focus:border focus:border-gold"
      >
        Skip to content
      </a>

      <nav
        aria-label="Site navigation"
        className="sticky top-0 z-40 h-[64px] px-6 flex justify-between items-center gap-3 border-b border-gold/[.09] bg-[#f2ede2]/80 backdrop-blur-md"
      >
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-display font-black text-lg text-parchment-900 no-underline"
          >
            Wordsmith
          </Link>
          <div className="hidden sm:flex items-center gap-5">{primaryLinks}</div>
        </div>

        {/* Desktop account/CTA slot */}
        <div className="hidden sm:flex items-center gap-3">
          {session === undefined ? (
            <div className="h-6 w-24" aria-hidden="true" />
          ) : session ? (
            <>
              {variant === "full" && (
                <>
                  <UsageBar
                    searchCount={userInfo?.searchCount || 0}
                    isPaid={isPaid}
                    onUpgrade={() => setPaywallOpen(true)}
                  />
                  {isPaid && (
                    <Link
                      href="/collections"
                      aria-current={
                        router.pathname === "/collections" ? "page" : undefined
                      }
                      className="font-body text-xs font-semibold text-gold no-underline"
                    >
                      Collections
                    </Link>
                  )}
                  {isPaid && (
                    <button
                      onClick={handleManage}
                      className="btn-ghost bg-transparent border-none text-parchment-500 text-xs cursor-pointer font-body"
                    >
                      Manage billing
                    </button>
                  )}
                  <span className="font-body text-xs text-parchment-600 truncate max-w-[140px] hidden md:inline">
                    {session.user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="bg-transparent border border-parchment-300 rounded px-3 py-1.5 text-xs text-parchment-600 cursor-pointer font-body hover:border-parchment-500 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              )}
              {variant === "lean" && (
                <Link
                  href="/"
                  className="btn-primary bg-gold text-white no-underline rounded-lg px-4 py-2 text-[13px] font-semibold font-body"
                >
                  Go to app
                </Link>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => openAuth("signin")}
                className="btn-ghost bg-transparent border-none text-parchment-600 text-[13px] cursor-pointer font-body font-medium"
              >
                Sign in
              </button>
              <button
                onClick={() => openAuth("signup")}
                className="btn-primary bg-gold text-white border-none rounded-lg px-4 py-2 text-[13px] font-semibold cursor-pointer font-body hover:opacity-90 transition-opacity"
              >
                Get started free
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="sm:hidden bg-transparent border-none text-parchment-800 cursor-pointer p-2"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
        </button>
      </nav>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="sm:hidden fixed inset-x-0 top-[64px] z-40 bg-[#f2ede2] border-b border-gold/[.09] px-6 py-4 flex flex-col gap-4 [overscroll-behavior:contain]"
        >
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.href ? "page" : undefined}
              className={`${linkBase} ${
                active === item.href ? "text-parchment-900 font-semibold" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
          {session === undefined ? null : session ? (
            <>
              {variant === "full" && isPaid && (
                <Link href="/collections" className={linkBase}>
                  Collections
                </Link>
              )}
              {variant === "full" && isPaid && (
                <button
                  onClick={handleManage}
                  className={`${linkBase} text-left bg-transparent border-none cursor-pointer`}
                >
                  Manage billing
                </button>
              )}
              <button
                onClick={handleSignOut}
                className={`${linkBase} text-left bg-transparent border-none cursor-pointer`}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuth("signin")}
                className={`${linkBase} text-left bg-transparent border-none cursor-pointer`}
              >
                Sign in
              </button>
              <button
                onClick={() => openAuth("signup")}
                className="btn-primary bg-gold text-white border-none rounded-lg px-4 py-2 text-[13px] font-semibold cursor-pointer font-body text-center"
              >
                Get started free
              </button>
            </>
          )}
        </div>
      )}

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
      <PaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors referencing `SiteNav.tsx`. (Other pre-existing files unchanged.)

- [ ] **Step 3: Commit**

```bash
git add src/components/nav/SiteNav.tsx
git commit -m "feat(nav): SiteNav shell component (full + lean variants)"
```

---

## Task 3: Layout system (`ShellLayout` + `_app` getLayout) applied to `/`

**Files:**
- Create: `src/components/nav/ShellLayout.tsx`
- Modify: `src/pages/_app.tsx`
- Modify: `src/pages/index.tsx` (remove bespoke nav + `<main>`, add `getLayout`)

**Interfaces:**
- Consumes: `SiteNav` (Task 2); existing `Footer` from `@/components/landing/Footer`; existing `WordRain` from `@/components/WordRain`; existing `useKonami` from `@/lib/use-konami`.
- Produces: `type NextPageWithLayout<P = {}> = NextPage<P> & { getLayout?: (page: ReactElement) => ReactNode }`; `export function withShell(variant: "full" | "lean"): (page: ReactElement) => ReactElement`.

The layout owns the site-wide easter egg (Konami key sequence + the Footer fleuron 5-click), so pages stop wiring it individually.

- [ ] **Step 1: Create the layout factory**

Create `src/components/nav/ShellLayout.tsx`:
```tsx
import { ReactElement, useState } from "react";
import SiteNav from "@/components/nav/SiteNav";
import Footer from "@/components/landing/Footer";
import WordRain from "@/components/WordRain";
import { useKonami } from "@/lib/use-konami";

function Shell({
  variant,
  children,
}: {
  variant: "full" | "lean";
  children: ReactElement;
}) {
  const [rain, setRain] = useState(false);
  useKonami(() => setRain(true));
  return (
    <>
      <SiteNav variant={variant} />
      <main id="main-content">{children}</main>
      <Footer onSecret={() => setRain(true)} />
      {rain && <WordRain onDone={() => setRain(false)} />}
    </>
  );
}

export function withShell(variant: "full" | "lean") {
  return function getLayout(page: ReactElement): ReactElement {
    return <Shell variant={variant}>{page}</Shell>;
  };
}
```

Note: verify `useKonami`'s call signature first (`grep -n "export function useKonami\|export const useKonami" src/lib/use-konami.ts` and read it). If it returns a boolean instead of taking a callback, adapt `Shell` to read that boolean into `rain` via `useEffect`. Verify `WordRain`'s prop name is `onDone` (`grep -n "onDone\|Props" src/components/WordRain.tsx`); use the actual prop.

- [ ] **Step 2: Wire `getLayout` in `_app.tsx`**

Modify `src/pages/_app.tsx`:
- Change the import line `import type { AppProps } from "next/app";` to:
```tsx
import type { AppProps } from "next/app";
import type { NextPage } from "next";
import type { ReactElement, ReactNode } from "react";
```
- Add after the imports:
```tsx
export type NextPageWithLayout<P = {}> = NextPage<P> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & { Component: NextPageWithLayout };
```
- Change the signature `export default function App({ Component, pageProps }: AppProps) {` to `({ Component, pageProps }: AppPropsWithLayout)`.
- Replace the render `<Component {...pageProps} />` (inside `<ErrorBoundary>`) with:
```tsx
{(Component.getLayout ?? ((page) => page))(<Component {...pageProps} />)}
```

- [ ] **Step 3: Convert `index.tsx` to the shell**

Modify `src/pages/index.tsx`:
- Delete the bespoke `<nav aria-label="Site navigation">...</nav>` block (the sticky nav, ~lines 153–183) AND the skip-link `<a href="#main-content">Skip to content</a>` above it (the layout now provides both).
- Change the page's `<main id="main-content">` opening tag to a fragment or `<div>` and remove its matching close — the layout now provides the single `<main id="main-content">`. (Do not leave a nested `<main>`.)
- Remove the page-level `<Footer ... />` render and any `<WordRain .../>` render + `useKonami` wiring in this page (the layout owns them). Remove now-unused imports (`Footer`, `WordRain`, `useKonami`) if nothing else uses them.
- Remove the nav-only auth state if it is now unused. Keep `AuthModal`/`PaywallModal` + their state ONLY if the page body still triggers them (e.g. the "Wordsmith Pro tracks your Slop Score" banner opens `setShowPaywall(true)` — keep that PaywallModal). If `showAuth`/`setAuthMode` are no longer referenced after removing the nav, delete them and the page's `<AuthModal>` render.
- At the bottom of the file, add:
```tsx
import type { NextPageWithLayout } from "@/pages/_app";
import { withShell } from "@/components/nav/ShellLayout";
// ...after the component definition, change its declaration to a named const typed
// as NextPageWithLayout if it is currently `export default function Home()`, or add:
(Home as NextPageWithLayout).getLayout = withShell("full");
export default Home;
```
Adapt to however the component is currently exported (if it is `export default function Home() {...}`, refactor to `const Home: NextPageWithLayout = () => {...}` then `Home.getLayout = withShell("full"); export default Home;`).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc clean; all tests pass (including Task 1).
Then: `grep -n "id=\"main-content\"" src/pages/index.tsx` → expect NO match (layout owns it). `grep -rn "main-content" src/components/nav/ShellLayout.tsx src/components/nav/SiteNav.tsx` → expect the skip-link in SiteNav + `<main>` in ShellLayout.

- [ ] **Step 5: Commit**

```bash
git add src/components/nav/ShellLayout.tsx src/pages/_app.tsx src/pages/index.tsx
git commit -m "feat(nav): getLayout shell system; convert home page to shared shell"
```

---

## Task 4: `/search` — full shell + de-land

**Files:**
- Modify: `src/pages/search.tsx`

**Interfaces:**
- Consumes: `withShell` + `NextPageWithLayout` (Task 3).

- [ ] **Step 1: Remove the bespoke nav + marketing landing**

Modify `src/pages/search.tsx`:
- Delete the bespoke `<nav aria-label="Site navigation">...</nav>` block (~242–314).
- In the `showLandingSections` render block (~533), remove `<Hero .../>`, the landing `<HowItWorks />`, `<FeaturesSection />`, `<PricingSection .../>`, `<CtaSection .../>`, and `<WordMarquee />`. KEEP `<SocialProofBar />` (render it as a slim strip under the search box) and keep the search box, results, starter words, `UsageBar` (if used in-body), `AuthModal`, `PaywallModal`, and the `WordRain` easter egg only if the page still triggers it — otherwise remove `WordRain`/`useKonami`/`Footer` from the page (the layout owns them).
- Remove the page-level `<Footer .../>` render and its `onSecret` wiring (layout owns Footer + easter egg).
- Remove now-unused imports: `Hero`, `HowItWorks` (landing), `FeaturesSection`, `PricingSection`, `CtaSection`, `WordMarquee`, `Footer`, and `WordRain`/`useKonami` if no longer used. Keep `SocialProofBar`, `AuthModal`, `PaywallModal`, `UsageBar`, `WordCard`.
- Remove the page's own `<main>` wrapper if present and rely on the layout's `<main id="main-content">` (no nested `<main>`).
- Keep `handleManageSubscription`, `handleSignOut`, `handleGetStarted`, `handleUpgrade` ONLY if still referenced by remaining in-body UI; delete any that become unused (the nav used several — remove dead ones to satisfy the no-unused lint).
- Add a one-line explainer above the search box and a "Browse the Word Library" `<Link href="/words">` cross-link so the tool page stands alone. Example copy (no em-dashes): `Find sharper alternatives for any word. Browse the full Word Library.`
- At the bottom: convert the export to `NextPageWithLayout` and set `getLayout = withShell("full")` (same mechanics as Task 3 Step 3), importing `withShell` and `NextPageWithLayout`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc clean (no unused-import/var errors), tests pass.
Then: `grep -nE "Hero|FeaturesSection|PricingSection|CtaSection|WordMarquee|TestimonialsSection" src/pages/search.tsx` → expect NO matches.

- [ ] **Step 3: Commit**

```bash
git add src/pages/search.tsx
git commit -m "feat(nav): /search adopts shell, drops duplicate marketing landing"
```

---

## Task 5: `/collections` — full shell

**Files:**
- Modify: `src/pages/collections.tsx`

- [ ] **Step 1: Convert**

Modify `src/pages/collections.tsx`:
- Delete the main bespoke `<nav>` (~253–272) and the `GuardScreen` nav/back-link chrome that duplicates site nav (keep the guard's message/CTA content, but it no longer needs its own nav — the layout provides it). If `GuardScreen` renders its own `<Footer>`, remove it.
- Remove the page-level `<Footer .../>` render(s).
- Remove any page-level `<main>` wrapper to avoid nesting under the layout's `<main>`.
- Keep `handleManageSubscription`/`handleSignOut` ONLY if still used by remaining in-body UI; otherwise delete (nav owned them). Remove now-unused imports.
- Set `getLayout = withShell("full")` and export as `NextPageWithLayout`.
- The page keeps `noindex` in its `<Head>` (unchanged).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/pages/collections.tsx
git commit -m "feat(nav): /collections adopts shared shell"
```

---

## Task 6: Content/SEO pages — lean shell

**Files:**
- Modify: `src/pages/words/index.tsx`, `src/pages/words/[word].tsx`, `src/pages/synonyms-for/[word].tsx`, `src/pages/words/category/[slug].tsx`

- [ ] **Step 1: Convert each of the four pages**

For EACH file:
- Remove the page-level `<Footer .../>` render (layout provides it).
- `words/index.tsx`: remove the centered "Wordsmith" eyebrow link (~33–38) — the shell logo replaces it. Keep the page `<h1>`/description and the category + A–Z content.
- `words/[word].tsx`, `synonyms-for/[word].tsx`, `words/category/[slug].tsx`: KEEP the breadcrumb `<nav>` (it renders inside the page body, below the shell), but remove the leading "Wordsmith" crumb's role as the only site link is fine to keep as a crumb. Do not add a page `<main>` (layout owns it); if the page wraps content in `<main>`, change it to `<div>`/fragment.
- Add at the bottom of each: `getLayout = withShell("lean")` + `NextPageWithLayout` export (same mechanics as Task 3 Step 3). These pages use `getStaticProps`/`getStaticPaths` — those are unaffected; only the component's export shape changes.
- Remove now-unused `Footer` imports.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean.
Then: `grep -rn "components/landing/Footer" src/pages/words src/pages/synonyms-for` → expect NO matches (layout owns Footer).

- [ ] **Step 3: Commit**

```bash
git add src/pages/words/index.tsx src/pages/words/[word].tsx src/pages/synonyms-for/[word].tsx src/pages/words/category/[slug].tsx
git commit -m "feat(nav): content/SEO pages adopt lean shell"
```

---

## Task 7: `/score` + `/privacy` — lean shell

**Files:**
- Modify: `src/pages/score.tsx`, `src/pages/privacy.tsx`

- [ ] **Step 1: Convert**

- `score.tsx`: remove page-level `<Footer />` render; set `getLayout = withShell("lean")`; keep the share card + `?v=` logic. No page `<main>` nesting.
- `privacy.tsx`: delete its bespoke logo-only `<nav>` (~83–105) and its inline back-link footer block (~188–208); set `getLayout = withShell("lean")` so it now uses the shared nav + shared `Footer`. Leave the inline `style={}` body content as-is (Tailwind conversion is explicitly out of scope). Remove no-longer-needed nav markup only.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/pages/score.tsx src/pages/privacy.tsx
git commit -m "feat(nav): /score and /privacy adopt lean shell"
```

---

## Task 8: Footer naming reconcile

**Files:**
- Modify: `src/components/landing/Footer.tsx`

- [ ] **Step 1: Apply naming canon + add Collections**

Modify `src/components/landing/Footer.tsx` link list (~35–64):
- Change the first content link's label from `Slop Score` to `Analyze` (href stays `/`).
- After the `Word Library` link, add a `Collections` link:
```tsx
<Link
  href="/collections"
  className="footer-link font-body text-[13px] text-parchment-600 no-underline transition-colors duration-200"
>
  Collections
</Link>
```
- Leave `Word Search` (`/search`), `Privacy` (`/privacy`), `Contact` (mailto), the tagline, and the fleuron button unchanged.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.
Then: `grep -n "Slop Score" src/components/landing/Footer.tsx` → expect NO match.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/Footer.tsx
git commit -m "feat(nav): footer naming canon + Collections link"
```

---

## Task 9: Delete dead landing components + full verify

**Files:**
- Delete: `src/components/landing/{Hero,FeaturesSection,PricingSection,CtaSection,HowItWorks,WordMarquee}.tsx`

- [ ] **Step 1: Confirm zero importers, then delete**

Run:
```bash
for c in Hero FeaturesSection PricingSection CtaSection HowItWorks WordMarquee; do
  echo "== $c =="; grep -rn "landing/$c\"" src --include=*.tsx --include=*.ts | grep -v "landing/$c.tsx"
done
```
Expected: NO output for each (zero importers). If any component still has an importer, do NOT delete it; report which page still imports it and stop.

Note: `landing/HowItWorks` is the search-landing variant; the home page uses `home/HowItWorks` (a different file) — deleting `landing/HowItWorks` must not touch `home/HowItWorks`. Confirm the importer grep distinguishes them.

Then delete the confirmed-dead files:
```bash
git rm src/components/landing/Hero.tsx src/components/landing/FeaturesSection.tsx src/components/landing/PricingSection.tsx src/components/landing/CtaSection.tsx src/components/landing/HowItWorks.tsx src/components/landing/WordMarquee.tsx
```
(Retain `Footer.tsx`, `SocialProofBar.tsx`, `Reveal.tsx`, `MagneticButton.tsx` — still referenced.)

- [ ] **Step 2: Full verification**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx vitest run`
Expected: all tests pass.

Run: `npx next build`
Expected: reaches "✓ Compiled successfully" (lint + types pass). The subsequent "Collecting page data … supabaseUrl is required" failure is the known empty-`.env.local` condition and is acceptable. If the build fails BEFORE "Compiled successfully" (a type or lint error, or an unresolved import from a deleted file), fix it.

Run: `grep -rn "components/landing/\(Hero\|FeaturesSection\|PricingSection\|CtaSection\|HowItWorks\|WordMarquee\)" src` 
Expected: NO matches.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(nav): delete dead landing components; verify build"
```

---

## Self-Review notes

- **Spec coverage:** shared SiteNav full/lean (T2); nav-config pure + tested (T1); getLayout wiring (T3); naming canon (T2 nav + T8 footer); `/search` de-land (T4); content pages lean (T6); `/privacy`+`/score` (T7); collections reachable via footer (T8) + full nav (T2/T5); hydration-safe account slot (T2 `session === undefined` skeleton); mobile menu Escape/aria/overscroll (T2); site-wide easter egg consolidation (T3). Testimonials already removed pre-plan.
- **Manual visual pass** (not automatable here; user reviews screens): after T9, run the dev server in the background and check `/`, `/search`, `/words`, a word page, `/collections`, `/privacy`, `/score` at desktop + mobile widths — one nav, correct active link, working sign-in/menu.
- **Deferred (unchanged):** nested-interactive card refactor; visual restyle; real `/account` page; landing/* animation-property cleanup.
