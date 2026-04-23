const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING:     { label: 'Pending',     cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  REVIEWING:   { label: 'Reviewing',   cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  SHORTLISTED: { label: 'Shortlisted', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  INTERVIEW:   { label: 'Interview',   cls: 'bg-purple-50 text-purple-700 ring-purple-200' },
  REJECTED:    { label: 'Rejected',    cls: 'bg-red-50 text-red-600 ring-red-200' },
  OFFERED:     { label: 'Offered',     cls: 'bg-teal-50 text-teal-700 ring-teal-200' },
  HIRED:       { label: 'Hired',       cls: 'bg-emerald-100 text-emerald-800 ring-emerald-300' },
  WITHDRAWN:   { label: 'Withdrawn',   cls: 'bg-slate-100 text-slate-400 ring-slate-200' },
  ACTIVE:      { label: 'Active',      cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CLOSED:      { label: 'Closed',      cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
  DRAFT:       { label: 'Draft',       cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  PAUSED:      { label: 'Paused',      cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
}

const STATUS_ICON: Record<string, string> = {
  PENDING: '⏸', REVIEWING: '🔍', SHORTLISTED: '⭐', INTERVIEW: '📅',
  REJECTED: '✕', OFFERED: '🎉', HIRED: '✓', WITHDRAWN: '↩',
  ACTIVE: '●', CLOSED: '●', DRAFT: '✎', PAUSED: '⏸',
}

export default function StatusBadge({ status, showIcon = true }: Readonly<{ status: string; showIcon?: boolean }>) {
  const cfg = STATUS_CFG[status] || { label: status, cls: 'bg-slate-100 text-slate-600 ring-slate-200' }
  const icon = STATUS_ICON[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ring-1 ${cfg.cls}`}>
      {showIcon && icon && <span className="text-[10px]">{icon}</span>}
      {cfg.label}
    </span>
  )
}
