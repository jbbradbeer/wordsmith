import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { useState } from "react";
import Head from "next/head";
import { Analytics } from "@vercel/analytics/react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SITE_URL } from "@/lib/seo";

const DEFAULT_TITLE = "Wordsmith — A Writer's Companion";
const DEFAULT_DESCRIPTION =
  "Find alternative, elevated words to improve your vocabulary and writing. Trade the ordinary for the extraordinary.";

export default function App({ Component, pageProps }: AppProps) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Head>
        <title>{DEFAULT_TITLE}</title>
        <meta name="description" content={DEFAULT_DESCRIPTION} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#F2EDE2" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

        {/* Social cards — pages can override title/description/url */}
        <meta property="og:site_name" content="Wordsmith" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={DEFAULT_TITLE} />
        <meta property="og:description" content={DEFAULT_DESCRIPTION} />
        <meta property="og:image" content={`${SITE_URL}/og.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={DEFAULT_TITLE} />
        <meta name="twitter:description" content={DEFAULT_DESCRIPTION} />
        <meta name="twitter:image" content={`${SITE_URL}/og.png`} />
      </Head>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
      <Analytics />
    </SessionContextProvider>
  );
}
