'use client'
import type { Application } from '@/types'

const STATUS_CFG: Record<string, { badge: string; dot: string }> = {
  PENDING:     { badge: 'bg-slate-100 text-slate-600 ring-slate-200',   dot: 'bg-slate-300' },
  REVIEWING:   { badge: 'bg-blue-50 text-blue-700 ring-blue-200',       dot: 'bg-blue-400' },
  SHORTLISTED: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  INTERVIEW:   { badge: 'bg-purple-50 text-purple-700 ring-purple-200', dot: 'bg-purple-400' },
  REJECTED:    { badge: 'bg-red-50 text-red-600 ring-red-200',          dot: 'bg-red-400' },
  OFFERED:     { badge: 'bg-teal-50 text-teal-700 ring-teal-200',       dot: 'bg-teal-400' },
  HIRED:       { badge: 'bg-emerald-100 text-emerald-800 ring-emerald-300', dot: 'bg-emerald-600' },
  WITHDRAWN:   { badge: 'bg-slate-100 text-slate-400 ring-slate-200',   dot: 'bg-slate-300' },
}
const STATUS_ICON: Record<string, string> = {
  PENDING:'⏸', REVIEWING:'🔍', SHORTLISTED:'⭐', INTERVIEW:'📅',
  REJECTED:'✕', OFFERED:'🎉', HIRED:'✓', WITHDRAWN:'↩',
}

const POSITIVE  = ['SHORTLISTED','INTERVIEW','OFFERED','HIRED']
const TIMELINE  = ['PENDING','REVIEWING','SHORTLISTED','INTERVIEW','OFFERED','HIRED']

interface Props {
  app: Application
  withdrawing: boolean
  deleting: boolean
  onWithdraw: (id: number) => void
  onDelete: (id: number) => void
}

export default function ApplicationCard({ app, withdrawing, deleting, onWithdraw, onDelete }: Props) {
  const cfg = STATUS_CFG[app.status] || STATUS_CFG.PENDING
  const isPositive = POSITIVE.includes(app.status)
  const curIdx = TIMELINE.indexOf(app.status)

  return (
    <div className={`card p-5 sm:p-6 fade-in ${isPositive ? 'ring-1 ring-emerald-200 shadow-emerald-50 shadow-md' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title + badge */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="font-display font-bold text-slate-900 text-base">{app.job_title}</h2>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ring-1 ${cfg.badge}`}>
              <span className="text-[10px]">{STATUS_ICON[app.status]}</span>
              {app.status_display}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-slate-500 mb-3">
            {app.job_department && <span>{app.job_department}</span>}
            {app.job_location && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {app.job_location}
              </span>
            )}
          </div>

          {/* Status message */}
          {app.status_message && (
            <div className={`text-sm rounded-xl px-4 py-3 mb-3 leading-relaxed ${
              isPositive
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium'
                : app.status === 'REJECTED'
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : 'bg-slate-50 text-slate-600 border border-slate-100'
            }`}>
              {app.status_message}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span>Applied {new Date(app.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {!['WITHDRAWN','HIRED','REJECTED'].includes(app.status) && (
              <button
                onClick={() => onWithdraw(app.id)}
                disabled={withdrawing || deleting}
                className="text-amber-500 hover:text-amber-700 disabled:opacity-40 font-medium transition-colors"
              >
                {withdrawing ? 'Withdrawing…' : 'Withdraw'}
              </button>
            )}
            <button
              onClick={() => onDelete(app.id)}
              disabled={deleting || withdrawing}
              className="text-red-400 hover:text-red-600 disabled:opacity-40 font-medium transition-colors"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Progress timeline — desktop */}
        <div className="hidden sm:flex shrink-0 flex-col items-center gap-0 pt-1">
          {TIMELINE.map((s, i) => {
            const past = !['REJECTED','WITHDRAWN'].includes(app.status) && i <= curIdx
            const cur  = s === app.status
            const dotColor = app.status === 'REJECTED'
              ? (i === 0 ? 'bg-red-400' : 'bg-slate-200')
              : app.status === 'WITHDRAWN'
                ? 'bg-slate-200'
                : cur ? 'bg-indigo-600 ring-2 ring-indigo-200 ring-offset-1'
                  : past ? 'bg-indigo-400' : 'bg-slate-200'
            return (
              <div key={s} className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full transition-colors ${dotColor}`} />
                {i < TIMELINE.length - 1 && (
                  <div className={`w-px h-5 ${past && !cur ? 'bg-indigo-300' : 'bg-slate-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
