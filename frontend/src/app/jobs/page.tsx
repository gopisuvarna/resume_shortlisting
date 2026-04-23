"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useJobsList } from "@/hooks/useJobs";
import Navbar from "@/components/shared/Navbar";
import JobCard from "@/components/jobs/JobCard";
import JobFilters from "@/components/jobs/JobFilters";

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || "Nueve IT Solutions";

export default function JobsPage() {
  const { isHR, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    jobs,
    loading,
    search,
    jobType,
    expLevel,
    setSearch,
    setJobType,
    setExpLevel,
  } = useJobsList();
  const positionSuffix = jobs.length === 1 ? "" : "s";
  const resultSuffix = jobs.length === 1 ? "" : "s";
  const headerLabel = loading
    ? "Loading…"
    : `${jobs.length} position${positionSuffix} available`;
  const resultLabel =
    search || jobType || expLevel
      ? `${jobs.length} result${resultSuffix} found`
      : "All open positions";

  let jobListContent: React.ReactNode;
  if (loading) {
    jobListContent = (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 skeleton" />
        ))}
      </div>
    );
  } else if (jobs.length === 0) {
    jobListContent = (
      <div className="card p-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <p className="font-display font-bold text-slate-700 mb-1">
          No positions found
        </p>
        <p className="text-sm text-slate-400">Try adjusting your filters</p>
      </div>
    );
  } else {
    jobListContent = (
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    );
  }

  useEffect(() => {
    if (!authLoading && isHR) router.replace("/hr/dashboard");
  }, [isHR, authLoading, router]);

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Navbar variant="applicant" />

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(150deg,#1a1f6e 0%,#2d3fc8 55%,#3b82f6 100%)",
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        {/* Soft orbs */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,#818cf8,transparent)" }}
        />
        <div
          className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle,#38bdf8,transparent)" }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/90 text-xs font-semibold">
              {headerLabel}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-white mb-4 text-balance">
            Build your career at
            <br className="hidden sm:block" />
            <span className="text-blue-200"> {COMPANY}</span>
          </h1>
          <p className="text-blue-200 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Join a team of passionate engineers, designers, and builders
            creating the future.
          </p>

          {/* Search bar */}
          <div className="max-w-3xl mx-auto">
            <JobFilters
              search={search}
              jobType={jobType}
              expLevel={expLevel}
              onSearch={setSearch}
              onJobType={setJobType}
              onExpLevel={setExpLevel}
              heroStyle
            />
          </div>
        </div>
      </div>

      {/* ── Job list ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Results label */}
        {!loading && (
          <p className="text-sm font-semibold text-slate-500 mb-4">
            {resultLabel}
          </p>
        )}

        {jobListContent}
      </div>
    </div>
  );
}
