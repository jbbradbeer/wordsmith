import type { GetServerSideProps } from "next";
import { SITE_URL } from "@/lib/seo";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /collections

Sitemap: ${SITE_URL}/sitemap.xml
`;

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=43200");
  res.write(body);
  res.end();
  return { props: {} };
};

export default function Robots() {
  return null;
}
