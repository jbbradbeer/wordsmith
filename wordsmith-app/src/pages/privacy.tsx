import Head from "next/head";
import type { NextPageWithLayout } from "@/pages/_app";
import { withShell } from "@/components/nav/ShellLayout";

const SECTIONS = [
  {
    title: "Information We Collect",
    content: [
      "When you create an account, we collect your email address for authentication and communication purposes.",
      "We store your word search queries to provide search history functionality and to improve our service.",
      "If you subscribe to our Pro plan, payment information is collected and processed securely by Stripe. We do not store your full credit card details on our servers.",
    ],
  },
  {
    title: "How We Use Your Information",
    content: [
      "To provide and maintain the Wordsmith service, including generating word alternatives and managing your account.",
      "To manage your account, subscriptions, and communicate important updates about the service.",
      "To track usage for free-tier limits and subscription management.",
      "To improve our word suggestion algorithms and overall user experience.",
    ],
  },
  {
    title: "Third-Party Services",
    content: [
      "Supabase: Provides authentication and database services. Your account data and search history are stored in Supabase. Data is processed according to Supabase's privacy policy.",
      "Stripe: Handles all payment processing for Pro subscriptions. Stripe processes your payment data according to their privacy policy and is PCI DSS compliant.",
      "Anthropic: Powers our AI word suggestions. Search queries are sent to Anthropic's API for processing. Data is handled according to Anthropic's privacy policy.",
      "Google: Provides OAuth authentication if you choose to sign in with Google. Data is processed according to Google's privacy policy.",
    ],
  },
  {
    title: "Data Storage and Security",
    content: [
      "Your data is stored securely on Supabase infrastructure, hosted on Amazon Web Services (AWS).",
      "Passwords are hashed and never stored in plain text.",
      "All payment processing is handled by Stripe, which is PCI DSS Level 1 compliant, the highest level of certification available.",
      "We use HTTPS encryption for all data transmission between your browser and our servers.",
    ],
  },
  {
    title: "Your Rights",
    content: [
      "You may delete your account at any time, which will remove your personal data and search history from our systems.",
      "You may request a copy of the data we hold about you by contacting us at the email address below.",
      "You may contact us at privacy@trywordsmith.com for any privacy-related questions or requests.",
    ],
  },
  {
    title: "Cookies",
    content: [
      "Wordsmith uses only essential cookies required for authentication and session management.",
      "We do not use tracking cookies, advertising cookies, or any third-party analytics cookies.",
    ],
  },
  {
    title: "Changes to This Policy",
    content: [
      "We may update this privacy policy from time to time. Any changes will be posted on this page with an updated revision date.",
      "Continued use of Wordsmith after changes constitutes acceptance of the revised policy.",
    ],
  },
  {
    title: "Contact Us",
    content: [
      "If you have any questions about this privacy policy or our data practices, please contact us at privacy@trywordsmith.com.",
    ],
  },
];

function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy | Wordsmith</title>
        <meta
          name="description"
          content="Privacy Policy for Wordsmith, a writer's companion for finding elevated word alternatives."
        />
      </Head>

      <div style={{ minHeight: "100vh", background: "#FDFBF7" }}>
        {/* Content */}
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            padding: "40px 24px 80px",
          }}
        >
          <header style={{ marginBottom: "48px" }}>
            <h1
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(32px, 5vw, 42px)",
                fontWeight: 800,
                color: "#1A1A18",
                margin: "0 0 8px 0",
                letterSpacing: "-0.02em",
              }}
            >
              Privacy Policy
            </h1>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#B8B2A8",
                margin: 0,
              }}
            >
              Last updated: February 2025
            </p>
          </header>

          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px",
              lineHeight: 1.7,
              color: "#1A1A18",
              marginBottom: "40px",
            }}
          >
            Wordsmith (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or
            &ldquo;us&rdquo;) is committed to protecting your privacy. This
            policy explains how we collect, use, and safeguard your information
            when you use our service.
          </p>

          {SECTIONS.map((section, i) => (
            <section key={section.title} style={{ marginBottom: "36px" }}>
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#1A1A18",
                  margin: "0 0 16px 0",
                  paddingBottom: "8px",
                  borderBottom: "1px solid #E8E2D8",
                }}
              >
                {i + 1}. {section.title}
              </h2>
              {section.content.map((paragraph, j) => (
                <p
                  key={j}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    color: "#8A8478",
                    margin: "0 0 12px 0",
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

(PrivacyPage as NextPageWithLayout).getLayout = withShell("lean");
export default PrivacyPage;
