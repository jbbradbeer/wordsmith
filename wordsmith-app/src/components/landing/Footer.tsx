import Link from "next/link";
import { useRef } from "react";

interface FooterProps {
  /** Fires after five clicks on the fleuron — the page's hidden flourish. */
  onSecret?: () => void;
}

const SECRET_CLICKS = 5;

export default function Footer({ onSecret }: FooterProps) {
  const clicks = useRef(0);

  const handleFleuron = () => {
    clicks.current += 1;
    if (clicks.current >= SECRET_CLICKS) {
      clicks.current = 0;
      onSecret?.();
    }
  };

  return (
    <footer className="border-t border-parchment-300 pt-10 pb-8 px-6">
      <div className="max-w-[900px] mx-auto flex justify-between items-start flex-wrap gap-6">
        <Link href="/" className="no-underline">
          <div className="font-display font-extrabold text-lg text-parchment-900 mb-1">
            Wordsmith
          </div>
          <div className="font-body text-[13px] text-parchment-500">
            De-slop your writing
          </div>
        </Link>

        <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
          <Link
            href="/"
            className="footer-link font-body text-[13px] text-parchment-600 no-underline transition-colors duration-200"
          >
            Analyze
          </Link>
          <Link
            href="/search"
            className="footer-link font-body text-[13px] text-parchment-600 no-underline transition-colors duration-200"
          >
            Word Search
          </Link>
          <Link
            href="/words"
            className="footer-link font-body text-[13px] text-parchment-600 no-underline transition-colors duration-200"
          >
            Word Library
          </Link>
          <Link
            href="/collections"
            className="footer-link font-body text-[13px] text-parchment-600 no-underline transition-colors duration-200"
          >
            Collections
          </Link>
          <Link
            href="/privacy"
            className="footer-link font-body text-[13px] text-parchment-600 no-underline transition-colors duration-200"
          >
            Privacy
          </Link>
          <a
            href="mailto:privacy@trywordsmith.com"
            className="footer-link font-body text-[13px] text-parchment-600 no-underline transition-colors duration-200"
          >
            Contact
          </a>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto mt-6 pt-5 text-center border-t border-parchment-300">
        <p className="font-body text-xs text-parchment-500 m-0">
          &copy; {new Date().getFullYear()} Wordsmith{" "}
          <button
            onClick={handleFleuron}
            aria-label="A decorative flourish"
            className="bg-transparent border-none p-0 mx-1 text-parchment-500 hover:text-gold cursor-pointer transition-colors duration-300 text-sm align-middle"
          >
            &#10086;
          </button>{" "}
          All rights reserved.
        </p>
      </div>
    </footer>
  );
}
