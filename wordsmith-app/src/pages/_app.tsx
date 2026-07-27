import "@/styles/globals.css";
import type { AppProps } from "next/app";
import type { NextPage } from "next";
import type { ReactElement, ReactNode } from "react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { useState } from "react";
import Head from "next/head";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SITE_URL } from "@/lib/seo";

// Self-hosted via next/font (no render-blocking Google Fonts <link>, no leak)
const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});
const body = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const DEFAULT_TITLE = "Wordsmith: The AI Writing Companion";
const DEFAULT_DESCRIPTION =
  "Wordsmith is the AI writing companion that keeps you sounding like you, not like AI. Paste a draft, get a Slop Score, and rewrite in your own voice. It never writes for you.";

export type NextPageWithLayout<P = {}> = NextPage<P> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & { Component: NextPageWithLayout };

export default function App({ Component, pageProps }: AppPropsWithLayout) {
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
        <meta
          name="google-site-verification"
          content="OqbD4oubDw9lArfh5Z9O0QbBqFX-o6xkclAjWuhBuEY"
        />
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
      <div className={`${display.variable} ${body.variable} font-body`}>
        <ErrorBoundary>
          {(Component.getLayout ?? ((page) => page))(<Component {...pageProps} />)}
        </ErrorBoundary>
      </div>
      <Analytics />
    </SessionContextProvider>
  );
}
