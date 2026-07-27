import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import {
  useSupabaseClient,
  useSessionContext,
} from "@supabase/auth-helpers-react";
import { useUserInfo } from "@/lib/use-user-info";
import { PRIMARY_NAV, activeNavHref } from "@/lib/nav-config";
import UsageBar from "@/components/UsageBar";
import AuthModal from "@/components/AuthModal";
import PaywallModal from "@/components/PaywallModal";

type Variant = "full" | "lean";

export default function SiteNav({ variant }: { variant: Variant }) {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { isLoading } = useSessionContext();
  const { userInfo, setUserInfo, session } = useUserInfo();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [manageError, setManageError] = useState(false);

  const active = activeNavHref(router.pathname);
  const isPaid = !!userInfo?.isPaid;

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setMenuOpen(false);
  };

  const handleManage = async () => {
    if (managing) return;
    setManaging(true);
    setManageError(false);
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("portal: no url in response");
        setManageError(true);
        setManaging(false);
      }
    } catch (e) {
      console.error("portal error", e);
      setManageError(true);
      setManaging(false);
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
          {isLoading ? (
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
                      disabled={managing}
                      className="btn-ghost bg-transparent border-none text-parchment-500 text-xs cursor-pointer font-body disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Manage billing
                    </button>
                  )}
                  {manageError && (
                    <span role="alert" className="font-body text-xs text-red-600">
                      Could not open billing. Please try again.
                    </span>
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
          {isLoading ? null : session ? (
            <>
              {variant === "lean" && (
                <Link href="/" className={linkBase}>
                  Go to app
                </Link>
              )}
              {variant === "full" && (
                <>
                  {isPaid && (
                    <Link
                      href="/collections"
                      aria-current={
                        router.pathname === "/collections" ? "page" : undefined
                      }
                      className={linkBase}
                    >
                      Collections
                    </Link>
                  )}
                  {isPaid && (
                    <button
                      onClick={handleManage}
                      disabled={managing}
                      className={`${linkBase} text-left bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Manage billing
                    </button>
                  )}
                  {manageError && (
                    <span role="alert" className="font-body text-xs text-red-600">
                      Could not open billing. Please try again.
                    </span>
                  )}
                  <button
                    onClick={handleSignOut}
                    className={`${linkBase} text-left bg-transparent border-none cursor-pointer`}
                  >
                    Sign out
                  </button>
                </>
              )}
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
