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
