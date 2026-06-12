import type { GetServerSideProps } from "next";
import { SEED_WORDS } from "@/lib/seed-words";
import { SITE_URL } from "@/lib/seo";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const paths = ["", "/words", "/privacy", ...SEED_WORDS.map((w) => `/words/${w}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join("\n")}
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
