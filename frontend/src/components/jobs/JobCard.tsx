"use client";
import Link from "next/link";
import type { Job } from "@/types";

const TYPE_COLORS: Record<string, string> = {
  FULL_TIME: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PART_TIME: "bg-sky-50 text-sky-700 ring-sky-200",
  CONTRACT: "bg-orange-50 text-orange-700 ring-orange-200",
  INTERNSHIP: "bg-purple-50 text-purple-700 ring-purple-200",
  REMOTE: "bg-teal-50 text-teal-700 ring-teal-200",
};

const DEPT_BADGES: Record<string, string> = {
  Engineering: "EN",
  Design: "DS",
  Marketing: "MK",
  Sales: "SA",
  Finance: "FN",
  HR: "HR",
  Product: "PD",
  "AI / Data Science": "ML",
  "AI/Data Science": "ML",
  "Data Science": "ML",
};

function getDepartmentBadge(department?: string): string {
  if (!department) return "JP";
  const explicit = DEPT_BADGES[department];
  if (explicit) return explicit;

  const parts = department
    .replaceAll(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "JP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function JobCard({ job }: Readonly<{ job: Job }>) {
  const typeCls =
    TYPE_COLORS[job.job_type] || "bg-slate-100 text-slate-600 ring-slate-200";
  const badge = getDepartmentBadge(job.department);
  const posted = new Date(job.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const openingSuffix = job.openings === 1 ? "" : "s";
  const openingsLabel = `${job.openings} opening${openingSuffix}`;
  const mobileFooterLabel = `${job.total_applicants} applied | ${openingsLabel}`;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="card-hover group block p-5 sm:p-6 fade-in"
    >
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex w-11 h-11 rounded-xl items-center justify-center text-xs font-bold tracking-wider shrink-0 bg-indigo-50 border border-indigo-100 text-indigo-700">
          {badge}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start flex-wrap gap-2 mb-1.5">
            <h2 className="font-display font-bold text-slate-900 text-base sm:text-lg leading-snug group-hover:text-indigo-600 transition-colors">
              {job.title}
            </h2>
            <span className={`badge ring-1 ${typeCls} shrink-0 mt-0.5`}>
              {job.job_type_display || job.job_type?.replace("_", " ")}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-3">
            <span className="font-semibold text-slate-600">
              {job.department}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {job.location}
            </span>
            {job.experience_display && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">{job.experience_display}</span>
              </>
            )}
            {job.salary_range && (
              <>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-emerald-600">
                  {job.salary_range}
                </span>
              </>
            )}
          </div>

          {job.skills_required?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.skills_required.slice(0, 5).map((skill) => (
                <span key={skill} className="skill-chip">
                  {skill}
                </span>
              ))}
              {job.skills_required.length > 5 && (
                <span className="text-xs text-slate-400 self-center font-medium">
                  +{job.skills_required.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="hidden sm:flex flex-col items-end shrink-0 gap-1 pt-0.5">
          <p className="text-xs text-slate-400 font-medium">{posted}</p>
          <p className="text-xs font-bold text-slate-600">
            {job.total_applicants}
            <span className="font-normal text-slate-400"> applied</span>
          </p>
          <p className="text-xs text-slate-400">{openingsLabel}</p>
          {job.deadline && (
            <p className="text-xs text-amber-600 font-semibold">
              Closes{" "}
              {new Date(job.deadline).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </p>
          )}
          <div className="mt-2 w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-colors">
            <svg
              className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition-colors"
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
          </div>
        </div>
      </div>

      <div className="sm:hidden flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-soft)] text-xs">
        <span className="text-slate-400 font-medium">{mobileFooterLabel}</span>
        {job.deadline ? (
          <span className="text-amber-600 font-semibold">
            Closes{" "}
            {new Date(job.deadline).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        ) : (
          <span className="text-indigo-500 font-semibold">View -&gt;</span>
        )}
      </div>
    </Link>
  );
}
