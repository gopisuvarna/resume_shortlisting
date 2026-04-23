"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { jobsAPI } from "@/lib/api";
import Link from "next/link";
import type { Job } from "@/types";
import Navbar from "@/components/shared/Navbar";
import StatusBadge from "@/components/ui/StatusBadge";
import { InlineLoader } from "@/components/shared/LoadingSpinner";

export default function HRJobsPage() {
  const { user, isHR, isApplicant, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (isApplicant) {
      router.replace("/jobs");
      return;
    }
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    fetchJobs();
  }, [user, isHR, isApplicant, authLoading, router]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { data } = await jobsAPI.list();
      setJobs(data.results ?? data);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this job? All applications will also be removed."))
      return;
    setDeleting(id);
    try {
      await jobsAPI.delete(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch {
      alert("Could not delete job.");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (job: Job) => {
    const newStatus = job.status === "ACTIVE" ? "CLOSED" : "ACTIVE";
    try {
      await jobsAPI.update(job.id, { status: newStatus });
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j)),
      );
    } catch {
      alert("Could not update status.");
    }
  };

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.department.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase()),
  );

  if (!isHR) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="hr" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Job Postings
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} posted
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs…"
                className="input-hr pl-9 w-full sm:w-56"
              />
            </div>
            <Link
              href="/hr/jobs/new"
              className="btn-hr self-start sm:self-auto"
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

        {loading ? (
          <InlineLoader />
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="font-display font-bold text-slate-700 mb-1.5">
              {search ? "No jobs match your search" : "No jobs posted yet"}
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Post your first job to start receiving applications
            </p>
            <Link href="/hr/jobs/new" className="btn-hr px-6">
              Post a Job
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="card overflow-hidden hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {[
                      "Job Title",
                      "Department",
                      "Location",
                      "Type",
                      "Status",
                      "Applicants",
                      "Deadline",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/hr/jobs/${job.id}`}
                          className="font-semibold text-slate-900 hover:text-violet-600 transition-colors"
                        >
                          {job.title}
                        </Link>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {job.openings} opening{job.openings !== 1 ? "s" : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {job.department}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {job.location}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-medium">
                          {job.job_type?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {job.total_applicants}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">
                        {job.deadline
                          ? new Date(job.deadline).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/hr/jobs/${job.id}`}
                            className="text-xs text-violet-600 hover:text-violet-800 font-semibold"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleToggle(job)}
                            className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                          >
                            {job.status === "ACTIVE" ? "Close" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDelete(job.id)}
                            disabled={deleting === job.id}
                            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 font-medium"
                          >
                            {deleting === job.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((job) => (
                <div key={job.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <Link
                        href={`/hr/jobs/${job.id}`}
                        className="font-display font-bold text-slate-900 hover:text-violet-600 transition-colors"
                      >
                        {job.title}
                      </Link>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {job.department} · {job.location}
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      <span className="font-bold text-slate-900">
                        {job.total_applicants}
                      </span>{" "}
                      applicants · {job.openings} openings
                    </span>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/hr/jobs/${job.id}`}
                        className="text-violet-600 font-semibold"
                      >
                        View →
                      </Link>
                      <button
                        onClick={() => handleToggle(job)}
                        className="text-slate-500 hover:text-slate-700 font-medium"
                      >
                        {job.status === "ACTIVE" ? "Close" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        disabled={deleting === job.id}
                        className="text-red-400 hover:text-red-600 disabled:opacity-40 font-medium"
                      >
                        {deleting === job.id ? "…" : "Del"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
