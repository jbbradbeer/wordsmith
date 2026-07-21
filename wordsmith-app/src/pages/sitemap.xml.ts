import type { GetServerSideProps } from "next";
import { SEED_WORDS } from "@/lib/seed-words";
import { WORD_HUBS } from "@/lib/word-hubs";
import { SYNONYM_VOLUMES } from "@/lib/synonym-volumes";
import { SITE_URL } from "@/lib/seo";

// Coarse priority from search volume so crawlers hit the biggest pages first.
function priorityFor(word: string): string {
  const v = SYNONYM_VOLUMES[word] ?? 0;
  if (v >= 50000) return "0.9";
  if (v >= 15000) return "0.8";
  if (v >= 5000) return "0.7";
  return "0.6";
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const staticEntries = [
    { path: "", priority: "1.0" },
    { path: "/words", priority: "0.8" },
    ...WORD_HUBS.map((h) => ({ path: `/words/category/${h.slug}`, priority: "0.8" })),
    { path: "/privacy", priority: "0.3" },
  ];
  // Both page types share the word_pages data but target different queries
  const wordEntries = SEED_WORDS.flatMap((w) => [
    { path: `/synonyms-for/${w}`, priority: priorityFor(w) },
    { path: `/words/${w}`, priority: priorityFor(w) },
  ]);
  const entries = [...staticEntries, ...wordEntries];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
    .map(
      (e) =>
        `  <url><loc>${SITE_URL}${e.path}</loc><priority>${e.priority}</priority></url>`
    )
    .join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=43200");
  res.write(xml);
  res.end();
  return { props: {} };
};

// Body is written in getServerSideProps; Next still requires a component
export default function Sitemap() {
  return null;
}
