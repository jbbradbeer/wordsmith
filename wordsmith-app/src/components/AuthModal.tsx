import { useState, useEffect, useRef } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import Modal from "./Modal";

type AuthMode = "signin" | "signup";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

const INPUT_CLASSES =
  "w-full box-border px-3.5 py-[11px] border-[1.5px] border-parchment-300 rounded-lg font-body text-sm text-parchment-900 bg-white";

const LABEL_CLASSES =
  "block font-body text-xs font-semibold text-parchment-700 mb-1.5 tracking-[0.04em] uppercase";

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = "signup",
}: AuthModalProps) {
  const supabase = useSupabaseClient();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Sync mode when initialMode prop changes (e.g. clicking "Sign in" vs "Get started free")
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const headingId = "auth-modal-title";
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        // If email confirmation is off, user gets a session immediately
        if (data.session) {
          onClose();
        } else {
          setSuccess("Check your email for a confirmation link!");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy={headingId} maxWidth={400}>
      <h2
        id={headingId}
        className="font-display font-bold text-[26px] text-parchment-900 text-center m-0 mb-1"
      >
        {mode === "signup" ? "Create Account" : "Welcome Back"}
      </h2>
      <p className="font-body text-sm text-parchment-600 text-center m-0 mb-6">
        {mode === "signup" ? "Start with 3 free word searches a day" : "Sign in to continue"}
      </p>

      {/* Google OAuth */}
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full p-3 border-[1.5px] border-parchment-300 rounded-[10px] bg-white font-body text-sm font-medium text-parchment-800 cursor-pointer flex items-center justify-center gap-2.5 mb-5 transition-colors duration-200 hover:border-parchment-400"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
            fill="#34A853"
          />
          <path
            d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-parchment-300" />
        <span className="font-body text-xs text-parchment-500">or</span>
        <div className="flex-1 h-px bg-parchment-300" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-3.5">
          <label htmlFor="auth-email" className={LABEL_CLASSES}>
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            name="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={INPUT_CLASSES}
          />
        </div>
        <div className="mb-5">
          <label htmlFor="auth-password" className={LABEL_CLASSES}>
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            name="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={INPUT_CLASSES}
          />
        </div>

        {error && (
          <p
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="font-body text-[13px] text-category-punchy mb-3.5 outline-none"
          >
            {error}
          </p>
        )}
        {success && (
          <p
            role="status"
            aria-live="polite"
            className="font-body text-[13px] text-category-rare mb-3.5"
          >
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`btn-primary w-full p-3 ${loading ? "bg-parchment-500 cursor-wait" : "bg-gold cursor-pointer"} text-white border-none rounded-[10px] font-body text-sm font-semibold tracking-[0.02em] transition-colors duration-200`}
        >
          {loading ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}
        </button>
      </form>

      <p className="font-body text-[13px] text-parchment-600 text-center mt-[18px] m-0">
        {mode === "signup" ? "Already have an account?" : "Don’t have an account?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
            setSuccess(null);
          }}
          className="bg-transparent border-none text-gold font-semibold cursor-pointer font-body text-[13px] p-0"
        >
          {mode === "signup" ? "Sign in" : "Sign up"}
        </button>
      </p>
    </Modal>
  );
}
