"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useHRDashboard } from "@/hooks/useHRDashboard";
import Navbar from "@/components/shared/Navbar";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";

const STAT_CFG = [
  {
    key: "activeJobs",
    label: "Active Jobs",
    icon: "📋",
    from: "#eef2ff",
    to: "#e0e7ff",
    text: "#3730a3",
  },
  {
    key: "totalApps",
    label: "Applications",
    icon: "📨",
    from: "#f5f3ff",
    to: "#ede9fe",
    text: "#5b21b6",
  },
  {
    key: "shortlisted",
    label: "Shortlisted",
    icon: "⭐",
    from: "#ecfdf5",
    to: "#d1fae5",
    text: "#065f46",
  },
  {
    key: "todayApps",
    label: "Today's New",
    icon: "🆕",
    from: "#fffbeb",
    to: "#fef3c7",
    text: "#92400e",
  },
];

export default function HRDashboard() {
  const { user, isHR, isApplicant, loading: authLoading } = useAuth();
  const router = useRouter();
  const { jobs, stats, loading, loadData } = useHRDashboard();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (isApplicant) {
      router.replace("/jobs");
      return;
    }
    loadData();
  }, [user, isHR, isApplicant, authLoading, loadData, router]);

  if (authLoading || loading) return <PageLoader color="violet" />;
  if (!isHR) return null;

  const activeJobs = jobs.filter((j) => j.status === "ACTIVE");
  const statValues: Record<string, number> = {
    activeJobs: activeJobs.length,
    totalApps: stats.totalApps,
    shortlisted: stats.shortlisted,
    todayApps: stats.todayApps,
  };

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Navbar variant="hr" />

      {/* ── Dashboard header strip ── */}
      <div className="border-b border-[var(--border)] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                Welcome back, {user?.first_name} 👋
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Here&apos;s your recruitment overview for today.
              </p>
            </div>
            <Link
              href="/hr/jobs/new"
              className="btn-hr self-start sm:self-auto"
              style={{ boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}
            >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Post a Job
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 sm:py-8 space-y-6">
        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CFG.map((cfg) => (
            <div
              key={cfg.key}
              className="card p-5 overflow-hidden relative"
              style={{
                background: `linear-gradient(135deg,${cfg.from},${cfg.to})`,
                border: "none",
              }}
            >
              {/* Decorative circle */}
              <div
                className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20"
                style={{ background: cfg.text }}
              />
              <div className="relative">
                <span className="text-2xl">{cfg.icon}</span>
                <p
                  className="text-3xl font-display font-bold mt-2"
                  style={{ color: cfg.text }}
                >
                  {statValues[cfg.key]}
                </p>
                <p
                  className="text-xs font-bold mt-0.5 uppercase tracking-wider"
                  style={{ color: cfg.text, opacity: 0.7 }}
                >
                  {cfg.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Jobs table ── */}
        <div className="card overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-display font-bold text-slate-900 text-lg">
              Job Postings
            </h2>
            <Link
              href="/hr/jobs"
              className="text-sm text-violet-600 font-bold hover:text-violet-800 transition-colors flex items-center gap-1"
            >
              View all{" "}
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-violet-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-slate-500 font-semibold mb-3">
                No jobs posted yet
              </p>
              <Link href="/hr/jobs/new" className="btn-hr px-5">
                Post your first job
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-soft)]">
              {/* Desktop header */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] px-6 py-2.5 bg-slate-50">
                {["Job Title", "Applicants", "Status", ""].map((h) => (
                  <span
                    key={h}
                    className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right first:text-left"
                  >
                    {h}
                  </span>
                ))}
              </div>

              {jobs.slice(0, 10).map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto] items-start sm:items-center px-5 sm:px-6 py-4 hover:bg-slate-50/70 transition-colors gap-2 sm:gap-4"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm">
                      {job.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {job.department} · {job.location}
                    </p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-lg font-display font-bold text-slate-900">
                      {job.total_applicants}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium -mt-0.5">
                      applicants
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <StatusBadge status={job.status} showIcon={false} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/hr/jobs/${job.id}`}
                      className="text-xs text-violet-600 hover:text-violet-800 font-bold transition-colors whitespace-nowrap"
                    >
                      Review →
                    </Link>
                    {/* Mobile stats */}
                    <span className="sm:hidden text-xs text-slate-400 font-medium">
                      {job.total_applicants} applicants
                    </span>
                    <div className="sm:hidden">
                      <StatusBadge status={job.status} showIcon={false} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              href: "/hr/jobs/new",
              label: "Post a New Job",
              icon: "🚀",
              desc: "Create a new job listing and start receiving applications.",
              variant: "hr",
            },
            {
              href: "/hr/jobs",
              label: "Manage Jobs",
              icon: "📋",
              desc: "View, edit, and manage all your active job postings.",
              variant: "default",
            },
            {
              href: "/hr/jobs",
              label: "Review Applications",
              icon: "👀",
              desc: "Review pending applications and update candidate statuses.",
              variant: "default",
            },
          ].map(({ href, label, icon, desc, variant }) => (
            <Link
              key={href + label}
              href={href}
              className={`card p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${variant === "hr" ? "bg-gradient-to-br from-violet-600 to-purple-700 border-0 text-white" : ""}`}
            >
              <span className="text-2xl">{icon}</span>
              <p
                className={`font-display font-bold mt-3 mb-1 ${variant === "hr" ? "text-white" : "text-slate-900"}`}
              >
                {label}
              </p>
              <p
                className={`text-xs leading-relaxed ${variant === "hr" ? "text-violet-200" : "text-slate-500"}`}
              >
                {desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
