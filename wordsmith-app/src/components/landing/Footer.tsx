import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid #E8E2D8",
        padding: "40px 24px 32px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "24px",
        }}
      >
        {/* Left: Brand */}
        <div>
          <div
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "18px",
              fontWeight: 800,
              color: "#1A1A18",
              marginBottom: "4px",
            }}
          >
            Wordsmith
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "#B8B2A8",
            }}
          >
            A Writer&apos;s Companion
          </div>
        </div>

        {/* Right: Links */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "center",
          }}
        >
          <Link
            href="/privacy"
            className="footer-link"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "#8A8478",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
          >
            Privacy Policy
          </Link>
          <a
            href="mailto:privacy@trywordsmith.com"
            className="footer-link"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "#8A8478",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
          >
            Contact
          </a>
        </div>
      </div>

      {/* Bottom: Copyright */}
      <div
        style={{
          maxWidth: "900px",
          margin: "24px auto 0",
          textAlign: "center",
          borderTop: "1px solid #E8E2D8",
          paddingTop: "20px",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            color: "#B8B2A8",
            margin: 0,
          }}
        >
          &copy; 2025 Wordsmith. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
