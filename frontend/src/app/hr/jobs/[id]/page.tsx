"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  jobsAPI,
  applicationsAPI,
  shortlistAPI,
  extractApiErrorMessage,
} from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import type { Application, Job, DaySummary } from "@/types";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import StatusBadge from "@/components/ui/StatusBadge";

const STATUSES = [
  "PENDING",
  "REVIEWING",
  "SHORTLISTED",
  "INTERVIEW",
  "REJECTED",
  "OFFERED",
  "HIRED",
];

const scoreColor = (s: number | null | undefined) => {
  if (s == null) return "text-slate-400";
  if (s >= 75) return "text-emerald-600 font-bold";
  if (s >= 50) return "text-amber-600 font-semibold";
  return "text-red-500";
};
const recBadge: Record<string, string> = {
  STRONG_YES: "bg-emerald-100 text-emerald-700",
  YES: "bg-teal-100 text-teal-700",
  MAYBE: "bg-amber-100 text-amber-700",
  NO: "bg-red-100 text-red-600",
};
const normalizeSkill = (
  item: string | { skill?: string; evidence?: string },
) =>
  typeof item === "string"
    ? { label: item, evidence: "" }
    : {
        label: (item?.skill || "").trim(),
        evidence: (item?.evidence || "").trim(),
      };

const statusButtonClass = (currentStatus: string, status: string) => {
  if (currentStatus !== status) {
    return "bg-white text-slate-600 border-[var(--border)] hover:border-slate-400 hover:bg-slate-50";
  }
  if (status === "SHORTLISTED") {
    return "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200";
  }
  if (status === "REJECTED") {
    return "bg-red-600 text-white border-red-600 shadow-sm shadow-red-200";
  }
  return "bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-200";
};

const statusTextClass = (status: string) => {
  if (status === "SHORTLISTED") return "text-emerald-600";
  if (status === "REJECTED") return "text-red-400";
  return "text-slate-400";
};

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

type NoticeTone = "success" | "error" | "info";

interface InlineNotice {
  title: string;
  message: string;
  tone: NoticeTone;
}

const noticeStyles: Record<
  NoticeTone,
  { shell: string; icon: string; bar: string; title: string }
> = {
  success: {
    shell: "border-emerald-200 bg-emerald-50/95 text-emerald-900",
    icon: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
    title: "text-emerald-900",
  },
  error: {
    shell: "border-red-200 bg-red-50/95 text-red-900",
    icon: "bg-red-100 text-red-700",
    bar: "bg-red-500",
    title: "text-red-900",
  },
  info: {
    shell: "border-violet-200 bg-white/95 text-slate-800",
    icon: "bg-violet-100 text-violet-700",
    bar: "bg-violet-500",
    title: "text-slate-900",
  },
};

function InlineNotification({
  notice,
  onClose,
}: Readonly<{
  notice: InlineNotice;
  onClose: () => void;
}>) {
  const styles = noticeStyles[notice.tone];
  let icon: React.ReactNode;

  if (notice.tone === "success") {
    icon = (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  } else if (notice.tone === "error") {
    icon = (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v4m0 4h.01M5.07 19h13.86A2 2 0 0020.66 16L13.73 4a2 2 0 00-3.46 0L3.34 16A2 2 0 005.07 19z"
        />
      </svg>
    );
  } else {
    icon = (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }

  return (
    <div className="fixed right-4 top-4 z-[60] w-[min(92vw,420px)] animate-[fadeIn_.2s_ease-out]">
      <div
        className={`relative overflow-hidden rounded-2xl border shadow-lg backdrop-blur ${styles.shell}`}
        style={{ boxShadow: "0 18px 45px rgba(15, 23, 42, 0.16)" }}
      >
        <div className={`absolute inset-x-0 top-0 h-1 ${styles.bar}`} />
        <div className="flex gap-3 p-4 pt-5">
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-bold ${styles.title}`}>
              {notice.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {notice.message}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-700"
            aria-label="Dismiss notification"
          >
            <svg
              className="h-4 w-4"
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
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Mobile Drawer component
──────────────────────────────────────────────────────── */
function MobileDrawer({
  open,
  onClose,
  children,
}: Readonly<MobileDrawerProps>) {
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    setClosing(true);
    globalThis.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 240);
  }, [onClose]);

  if (!open && !closing) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close applicant profile"
        className={`drawer-overlay ${closing ? "closing" : ""}`}
        onClick={close}
      />
      <div className={`drawer-sheet ${closing ? "closing" : ""}`}>
        <div className="drawer-handle" />
        {/* Close button */}
        <div className="flex items-center justify-between px-5 pb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Applicant Profile
          </span>
          <button
            onClick={close}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="px-5 pb-8">{children}</div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────
   Score sub-scores row
──────────────────────────────────────────────────────── */
function SubScores({ app }: Readonly<{ app: Application }>) {
  return (
    <div className="flex gap-2 mt-2">
      {[
        { label: "NLP", val: app.nlp_score },
        { label: "Vector", val: app.embedding_score },
        { label: "LLM", val: app.llm_score },
      ].map(({ label, val }) => (
        <div
          key={label}
          className="flex-1 bg-slate-50 border border-[var(--border)] rounded-xl p-2 text-center"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
            {label}
          </p>
          <p className="text-sm font-bold text-slate-700">
            {Math.round(val || 0)}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Applicant detail content (shared between panel + drawer)
──────────────────────────────────────────────────────── */
function ApplicantDetail({
  selected,
  statusUpdating,
  deleting,
  onUpdateStatus,
  onDelete,
}: Readonly<{
  selected: Application;
  statusUpdating: boolean;
  deleting: boolean;
  onUpdateStatus: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}>) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold text-slate-900">
            {selected.applicant_name}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {selected.applicant_email}
          </p>
          {selected.applicant_phone && (
            <p className="text-slate-400 text-sm">{selected.applicant_phone}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusBadge status={selected.status} />
            {selected.ai_recommendation && (
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${recBadge[selected.ai_recommendation] || "bg-slate-100 text-slate-500"}`}
              >
                AI: {selected.ai_recommendation.replace("_", " ")}
              </span>
            )}
          </div>
        </div>

        {/* AI Score */}
        {selected.ai_score != null && (
          <div className="flex flex-col gap-2 shrink-0">
            <div
              className="bg-white border border-[var(--border)] rounded-2xl px-6 py-3 text-center"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            >
              <div
                className={`text-4xl font-display font-bold leading-none ${scoreColor(selected.ai_score)}`}
              >
                {Math.round(selected.ai_score)}
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                AI Score
              </p>
            </div>
            <SubScores app={selected} />
          </div>
        )}
      </div>

      {/* AI Analysis */}
      {selected.ai_summary && (
        <div
          className="p-4 rounded-2xl border"
          style={{
            background: "linear-gradient(135deg,#f5f3ff,#faf5ff)",
            borderColor: "#ddd6fe",
          }}
        >
          <p className="text-[11px] font-bold text-violet-600 mb-2 uppercase tracking-wider">
            ✦ AI Analysis
          </p>
          <p className="text-sm text-slate-700 leading-relaxed mb-3">
            {selected.ai_summary}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selected.ai_matched_skills &&
              selected.ai_matched_skills.length > 0 && (
                <div>
                  <p className="text-xs text-emerald-700 font-bold mb-1.5">
                    ✓ Matched
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selected.ai_matched_skills.map((item) => {
                      const n = normalizeSkill(item);
                      if (!n.label) return null;
                      const skillKey = `${n.label}::${n.evidence}`;
                      return (
                        <span
                          key={skillKey}
                          title={n.evidence || undefined}
                          className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg font-semibold"
                        >
                          {n.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            {selected.ai_missing_skills &&
              selected.ai_missing_skills.length > 0 && (
                <div>
                  <p className="text-xs text-red-600 font-bold mb-1.5">
                    ✗ Missing
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selected.ai_missing_skills.map((s: string) => (
                      <span
                        key={s}
                        className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-lg font-semibold border border-red-100"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: "Current Company", value: selected.current_company || "—" },
          { label: "Current Role", value: selected.current_role || "—" },
          {
            label: "Experience",
            value: `${selected.years_of_experience} yr${selected.years_of_experience === 1 ? "" : "s"}`,
          },
          {
            label: "Notice Period",
            value: `${selected.notice_period_days} days`,
          },
          {
            label: "Expected Salary",
            value: selected.expected_salary
              ? `₹${Number(selected.expected_salary).toLocaleString("en-IN")}`
              : "—",
          },
          {
            label: "Applied On",
            value: new Date(selected.applied_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          },
        ].map((item) => (
          <div key={item.label} className="card p-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              {item.label}
            </p>
            <p className="text-sm font-bold text-slate-800 truncate">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Skills */}
      {selected.skills_mentioned && selected.skills_mentioned.length > 0 && (
        <div>
          <p className="text-sm font-bold text-slate-700 mb-2">
            Skills Mentioned
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.skills_mentioned.map((s: string) => (
              <span key={s} className="skill-chip">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-3">
        {selected.resume_url && (
          <a
            href={selected.resume_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors"
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Resume
          </a>
        )}
        {selected.linkedin_url && (
          <a
            href={selected.linkedin_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors"
          >
            LinkedIn ↗
          </a>
        )}
        {selected.portfolio_url && (
          <a
            href={selected.portfolio_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-slate-600 hover:text-slate-800 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-slate-100 transition-colors"
          >
            Portfolio ↗
          </a>
        )}
      </div>

      {/* Cover letter */}
      {selected.cover_letter && (
        <div>
          <p className="text-sm font-bold text-slate-700 mb-2">Cover Letter</p>
          <div className="bg-slate-50 border border-[var(--border)] rounded-2xl p-4 text-sm text-slate-600 whitespace-pre-line leading-relaxed">
            {selected.cover_letter}
          </div>
        </div>
      )}

      {/* LLM explanation */}
      {selected.llm_explanation && (
        <div>
          <p className="text-sm font-bold text-slate-700 mb-2">
            LLM Match Explanation
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800 leading-relaxed">
            {selected.llm_explanation}
          </div>
        </div>
      )}

      {/* Status actions */}
      <div className="border-t border-[var(--border)] pt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-700">Update Status</p>
          <button
            onClick={() => onDelete(selected.id)}
            disabled={deleting}
            className="text-xs text-red-500 hover:text-red-700 font-semibold disabled:opacity-50 transition-colors hover:underline"
          >
            {deleting ? "Deleting…" : "Delete Application"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onUpdateStatus(selected.id, s)}
              disabled={statusUpdating}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all disabled:opacity-50 active:scale-95 ${statusButtonClass(selected.status, s)}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Main page
──────────────────────────────────────────────────────── */
export default function HRJobApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isHR, isApplicant } = useAuth();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [threshold, setThreshold] = useState(65);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<InlineNotice | null>(null);

  const showNotice = useCallback(
    (title: string, message: string, tone: NoticeTone = "info") => {
      setNotice({ title, message, tone });
    },
    [],
  );

  const refreshDaySummary = useCallback(async () => {
    const { data } = await applicationsAPI.dailySummary(Number(id));
    setDays(data);
  }, [id]);

  useEffect(() => {
    if (!notice) return;
    const timer = globalThis.setTimeout(() => setNotice(null), 4200);
    return () => globalThis.clearTimeout(timer);
  }, [notice]);

  const loadApps = useCallback(
    async (date: string) => {
      setAppsLoading(true);
      setSelected(null);
      setDrawerOpen(false);
      try {
        const { data } = await applicationsAPI.byJob(
          Number(id),
          date || undefined,
        );
        setApps(data);
      } catch {
        setApps([]);
      } finally {
        setAppsLoading(false);
      }
    },
    [id],
  );

  const loadJob = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: j }, { data: d }] = await Promise.all([
        jobsAPI.get(Number(id)),
        applicationsAPI.dailySummary(Number(id)),
      ]);
      setJob(j);
      setDays(d);
      if (d.length > 0) setSelectedDate(d[0].applied_at__date);
      else loadApps("");
    } catch {
      router.push("/hr/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, loadApps, router]);

  useEffect(() => {
    if (isApplicant) {
      router.replace("/jobs");
      return;
    }
    if (!user && !isHR) {
      router.replace("/auth/login");
      return;
    }
    loadJob();
  }, [isHR, isApplicant, loadJob, router, user]);

  useEffect(() => {
    loadApps(selectedDate);
  }, [loadApps, selectedDate]);

  const selectApplicant = (app: Application) => {
    setSelected(app);
    setDrawerOpen(true); // always open drawer on mobile; desktop shows in panel
  };

  const updateStatus = async (appId: number, status: string) => {
    setStatusUpdating(true);
    try {
      await applicationsAPI.updateStatus(appId, { status });
      setApps((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a)),
      );
      if (selected?.id === appId)
        setSelected((s) => (s ? { ...s, status } : s));
    } finally {
      setStatusUpdating(false);
    }
  };

  const deleteApplication = async (appId: number) => {
    if (!confirm("Permanently delete this application?")) return;
    setDeleting(true);
    try {
      await applicationsAPI.delete(appId);
      setApps((prev) => prev.filter((a) => a.id !== appId));
      setSelected(null);
      setDrawerOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const bulkShortlist = async () => {
    const safeThreshold = Math.max(0, Math.min(100, Number(threshold)));
    if (!Number.isFinite(safeThreshold)) {
      showNotice(
        "Invalid threshold",
        "Enter a shortlist threshold between 0 and 100.",
        "error",
      );
      return;
    }

    setBulkRunning(true);
    try {
      const previouslyShortlisted = apps.filter(
        (app) =>
          app.status === "SHORTLISTED" &&
          app.ai_score != null &&
          app.ai_score >= safeThreshold,
      ).length;
      const { data } = await shortlistAPI.bulkShortlist(
        Number(id),
        safeThreshold,
      );
      const scoredCandidates = apps.filter(
        (app) => app.ai_score != null,
      ).length;
      const aboveThreshold = apps.filter(
        (app) => app.ai_score != null && app.ai_score >= safeThreshold,
      ).length;
      setThreshold(safeThreshold);
      await Promise.all([loadApps(selectedDate), refreshDaySummary()]);

      const alreadyShortlistedCount =
        aboveThreshold > 0 && (data?.shortlisted ?? 0) === 0
          ? previouslyShortlisted
          : 0;

      if ((data?.shortlisted ?? 0) === 0) {
        if (scoredCandidates === 0) {
          showNotice(
            "No scored applications",
            "No applications have been AI-scored yet, so bulk shortlist cannot shortlist anyone. Score or rescore the applications first.",
            "info",
          );
        } else if (aboveThreshold === 0) {
          showNotice(
            "No candidates matched",
            `No candidates meet the current cutoff of ${safeThreshold}. ${scoredCandidates} application(s) have AI scores, but none are at or above this threshold.`,
            "info",
          );
        } else if (alreadyShortlistedCount > 0) {
          showNotice(
            "Already shortlisted",
            `${alreadyShortlistedCount} candidate(s) already meet the cutoff of ${safeThreshold} and were already in Shortlisted status, so no new changes were needed.`,
            "info",
          );
        } else {
          showNotice(
            "No shortlist changes",
            data?.message || "No new candidates were shortlisted.",
            "info",
          );
        }
      } else {
        const revertedMessage = data?.reverted
          ? ` ${data.reverted} candidate(s) moved back to Reviewing.`
          : "";
        showNotice(
          "Bulk shortlist updated",
          `${data?.shortlisted ?? 0} new candidate(s) were shortlisted at cutoff ${safeThreshold}.${revertedMessage}`,
          "success",
        );
      }
    } catch (error: unknown) {
      showNotice(
        "Shortlist update failed",
        extractApiErrorMessage(
          error,
          "Bulk shortlist failed. Please try again.",
          true,
        ),
        "error",
      );
    } finally {
      setBulkRunning(false);
    }
  };

  const applicantsContent = () => {
    if (appsLoading) {
      return (
        <div className="p-3 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[72px] skeleton" />
          ))}
        </div>
      );
    }

    if (apps.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-slate-300">
          <svg
            className="w-10 h-10 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <p className="text-sm font-medium">No applications</p>
        </div>
      );
    }

    return apps.map((app) => (
      <button
        key={app.id}
        onClick={() => selectApplicant(app)}
        className={`w-full text-left px-4 py-3.5 border-b border-[var(--border-soft)] transition-all group
          ${
            selected?.id === app.id
              ? "bg-violet-50 border-l-[3px] border-l-violet-500 pl-[13px]"
              : "hover:bg-slate-50 border-l-[3px] border-l-transparent"
          }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800 truncate leading-tight">
              {app.applicant_name}
            </p>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {app.current_role || "—"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {app.years_of_experience}y exp
            </p>
          </div>
          <div className="shrink-0 text-right">
            {app.ai_score == null ? (
              <div className="text-xs text-slate-300">—</div>
            ) : (
              <div className={`text-sm font-bold ${scoreColor(app.ai_score)}`}>
                {Math.round(app.ai_score)}
              </div>
            )}
            <p
              className={`text-[10px] font-bold mt-0.5 ${statusTextClass(app.status)}`}
            >
              {app.status}
            </p>
          </div>
        </div>
      </button>
    ));
  };

  if (loading) return <PageLoader color="violet" />;
  if (!isHR || !job) return null;

  return (
    <div
      className="flex flex-col"
      style={{ height: "100vh", overflow: "hidden" }}
    >
      {notice && (
        <InlineNotification notice={notice} onClose={() => setNotice(null)} />
      )}
      {/* ── Top nav bar ── */}
      <nav
        className="bg-white border-b border-[var(--border)] shrink-0 z-30"
        style={{
          boxShadow: "0 1px 0 var(--border),0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div className="px-4 sm:px-6 h-16 flex items-center gap-3">
          {/* Logo + breadcrumb */}
          <Link href="/hr/dashboard" className="shrink-0">
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#1a3a8f,#3b82f6)" }}
            >
              <Image
                src="/nueve-logo.png"
                alt=""
                width={28}
                height={28}
                className="w-7 h-7 object-contain"
              />
            </div>
          </Link>
          <svg
            className="w-4 h-4 text-slate-300 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <Link
            href="/hr/jobs"
            className="text-slate-500 text-sm font-semibold hover:text-slate-900 transition-colors shrink-0"
          >
            Jobs
          </Link>
          <svg
            className="w-4 h-4 text-slate-300 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="text-slate-800 text-sm font-bold truncate">
            {job.title}
          </span>

          {/* Right controls */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Bulk shortlist – desktop only */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-[var(--border)] rounded-xl px-3 py-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Auto-shortlist ≥
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={threshold}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setThreshold(
                    nextValue === "" ? Number.NaN : Number(nextValue),
                  );
                }}
                className="w-12 px-2 py-1 border border-[var(--border)] rounded-lg text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
              />
              <button
                type="button"
                onClick={bulkShortlist}
                disabled={bulkRunning}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
                style={{ boxShadow: "0 2px 6px rgba(124,58,237,0.3)" }}
              >
                {bulkRunning ? "…" : "⚡ Bulk Shortlist"}
              </button>
            </div>

            {/* Status select */}
            <select
              value={job.status}
              onChange={async (e) => {
                const ns = e.target.value;
                try {
                  await jobsAPI.update(job.id, { status: ns });
                  setJob((j) => (j ? { ...j, status: ns } : j));
                } catch {
                  showNotice(
                    "Status update failed",
                    "Could not update job status.",
                    "error",
                  );
                }
              }}
              className="text-xs border border-[var(--border)] rounded-xl px-3 py-1.5 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
            >
              {["ACTIVE", "CLOSED", "PAUSED", "DRAFT"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </nav>

      {/* ── Three-panel layout ── */}
      <div className="flex flex-1 min-h-0">
        {/* Panel 1 — Date sidebar (desktop only) */}
        <div className="hidden lg:flex flex-col w-44 shrink-0 bg-white border-r border-[var(--border)] overflow-y-auto">
          <div className="px-4 py-3 border-b border-[var(--border-soft)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              By Date
            </p>
          </div>
          <button
            onClick={() => setSelectedDate("")}
            className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors border-b border-[var(--border-soft)] ${
              selectedDate === ""
                ? "bg-violet-50 text-violet-700"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            All dates
          </button>
          {days.map((d) => (
            <button
              key={d.applied_at__date}
              onClick={() => setSelectedDate(d.applied_at__date)}
              className={`w-full text-left px-4 py-2.5 border-b border-[var(--border-soft)] transition-colors ${
                selectedDate === d.applied_at__date
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <p className="text-xs font-bold">
                {new Date(d.applied_at__date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {d.total} · {d.shortlisted} ⭐
              </p>
            </button>
          ))}
        </div>

        {/* Panel 2 — Applicants list */}
        <div className="w-full md:w-72 shrink-0 bg-white border-r border-[var(--border)] overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--border-soft)] flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {appsLoading ? "…" : `${apps.length} Applicants`}
            </p>
            {/* Mobile date selector */}
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="lg:hidden text-xs border border-[var(--border)] rounded-lg px-2 py-1.5 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">All dates</option>
              {days.map((d) => (
                <option key={d.applied_at__date} value={d.applied_at__date}>
                  {new Date(d.applied_at__date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  ({d.total})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">{applicantsContent()}</div>
        </div>

        {/* Panel 3 — Detail (desktop only) */}
        <div className="hidden md:flex flex-1 overflow-y-auto flex-col bg-[var(--surface)]">
          {selected ? (
            <div className="p-6 max-w-2xl fade-in">
              <ApplicantDetail
                selected={selected}
                statusUpdating={statusUpdating}
                deleting={deleting}
                onUpdateStatus={updateStatus}
                onDelete={deleteApplication}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white border-2 border-dashed border-slate-200 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-9 h-9 text-slate-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-400">
                  Select an applicant to review
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {selected && (
          <ApplicantDetail
            selected={selected}
            statusUpdating={statusUpdating}
            deleting={deleting}
            onUpdateStatus={updateStatus}
            onDelete={deleteApplication}
          />
        )}
      </MobileDrawer>
    </div>
  );
}
