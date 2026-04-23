"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { extractApiErrorMessage } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import ErrorAlert from "@/components/shared/ErrorAlert";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || "Nueve IT Solutions";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (error: unknown) {
      setError(
        extractApiErrorMessage(
          error,
          "Invalid email or password.",
          true,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — decorative */}
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center"
        style={{
          background:
            "linear-gradient(145deg,#1a1f6e 0%,#2d3fc8 50%,#1e56c5 100%)",
        }}
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.15) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glowing orbs */}
        <div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,#6ea8ff,transparent)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,#a78bfa,transparent)" }}
        />

        <div className="relative z-10 text-center px-10">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <Image
              src="/nueve-logo.png"
              alt={COMPANY}
              width={64}
              height={64}
              className="object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-3">
            {COMPANY}
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed max-w-xs mx-auto">
            Your career starts here. Find the role you were meant for.
          </p>
          <div className="mt-10 flex justify-center gap-8">
            {[
              { n: "200+", label: "Open Roles" },
              { n: "50+", label: "Teams" },
              { n: "99%", label: "Satisfaction" },
            ].map(({ n, label }) => (
              <div key={label} className="text-center">
                <p className="font-display text-2xl font-bold text-white">
                  {n}
                </p>
                <p className="text-xs text-blue-300 font-semibold mt-0.5">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[var(--surface)]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div
              className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#1a3a8f,#3b82f6)" }}
            >
              <Image
                src="/nueve-logo.png"
                alt=""
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <div>
              <p className="font-display font-bold text-slate-900 text-lg leading-tight">
                {COMPANY}
              </p>
              <p className="text-xs text-slate-400 font-semibold">
                Careers Portal
              </p>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">
            Welcome back
          </h2>
          <p className="text-slate-500 text-sm mb-7">
            Sign in to your account to continue
          </p>

          <div className="card p-7">
            {error && (
              <ErrorAlert
                message={error}
                onClose={() => setError("")}
                className="mb-5"
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pr-11"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-base justify-center mt-1"
                style={{ boxShadow: "0 4px 14px rgba(79,70,229,0.4)" }}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" color="white" /> Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[var(--border-soft)] space-y-2.5 text-center text-sm text-slate-500">
              <p>
                New here?{" "}
                <Link
                  href="/auth/register"
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Create account
                </Link>
              </p>
              <p>
                HR Manager?{" "}
                <Link
                  href="/auth/register-hr"
                  className="text-indigo-600 font-bold hover:underline"
                >
                  HR Registration
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
