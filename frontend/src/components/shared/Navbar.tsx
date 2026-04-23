"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface NavbarProps {
  variant?: "applicant" | "hr";
}

export default function Navbar({ variant = "applicant" }: NavbarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const isHR = variant === "hr";
  const [open, setOpen] = useState(false);

  const accentHover = isHR ? "hover:text-violet-600" : "hover:text-indigo-600";
  const activeBg = isHR
    ? "bg-violet-50 text-violet-700"
    : "bg-indigo-50 text-indigo-700";
  const ringCls = isHR
    ? "ring-2 ring-violet-200 bg-violet-50 text-violet-700"
    : "ring-2 ring-indigo-200 bg-indigo-50 text-indigo-700";
  const ctaBtnCls = isHR
    ? "bg-violet-600 hover:bg-violet-700 text-white shadow-[0_2px_8px_rgba(124,58,237,0.35)]"
    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_2px_8px_rgba(79,70,229,0.35)]";

  const hrLinks = [
    { href: "/hr/dashboard", label: "Dashboard" },
    { href: "/hr/jobs", label: "Jobs" },
    { href: "/hr/jobs/new", label: "Post Job" },
  ];
  const appLinks = user
    ? [
        { href: "/jobs", label: "Browse Jobs" },
        { href: "/my-applications", label: "My Applications" },
      ]
    : [];
  const links = isHR ? hrLinks : appLinks;

  const isActive = (href: string) => pathname === href;

  return (
    <nav
      className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[var(--border)]"
      style={{ boxShadow: "0 1px 0 #e4e8f0, 0 2px 8px rgba(0,0,0,0.04)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* ── Logo ── */}
          <Link
            href={isHR ? "/hr/dashboard" : "/jobs"}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center">
              <Image
                src="/nueve-logo.png"
                alt="Nueve IT Solutions"
                width={36}
                height={36}
                className="object-contain w-9 h-9"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-bold text-[1.05rem] text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight block">
                Nueve IT Solutions
              </span>
              {isHR && (
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 leading-none block">
                  HR Portal
                </span>
              )}
            </div>
          </Link>

          {/* ── Desktop nav links ── */}
          {links.length > 0 && (
            <div className="hidden md:flex items-center gap-0.5 bg-slate-50 rounded-xl p-1 border border-[var(--border)]">
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    isActive(href)
                      ? `${activeBg} shadow-sm`
                      : `text-slate-500 ${accentHover} hover:bg-white hover:shadow-sm`
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* ── Right side ── */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                {/* Desktop user info */}
                <div className="hidden sm:flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800 leading-tight">
                      {user.full_name}
                    </p>
                    <p className="text-xs text-slate-400 leading-tight">
                      {isHR
                        ? user.hr_department || "Human Resources"
                        : user.email}
                    </p>
                  </div>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${ringCls}`}
                  >
                    {user.first_name?.[0]}
                    {user.last_name?.[0]}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold
                             text-slate-400 hover:text-red-500 px-3 py-2 rounded-xl
                             hover:bg-red-50 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign out
                </button>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className={`text-sm font-semibold text-slate-600 ${accentHover} px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors`}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className={`text-sm font-bold px-4 py-2 rounded-xl transition-all ${ctaBtnCls}`}
                >
                  Get started
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden p-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {open ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile dropdown ── */}
      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-white slide-down">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isActive(href)
                    ? `${activeBg}`
                    : `text-slate-600 hover:bg-slate-50 ${accentHover}`
                }`}
              >
                {label}
              </Link>
            ))}

            {user ? (
              <div className="pt-3 mt-3 border-t border-[var(--border-soft)]">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${ringCls}`}
                  >
                    {user.first_name?.[0]}
                    {user.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {user.full_name}
                    </p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="pt-3 mt-3 border-t border-[var(--border-soft)] space-y-2">
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 text-sm font-bold rounded-xl text-center transition-all ${ctaBtnCls}`}
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
