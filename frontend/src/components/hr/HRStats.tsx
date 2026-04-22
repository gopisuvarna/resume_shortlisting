interface StatCardProps {
  label: string
  value: number | string
  icon: string
  colorCls: string
}

export function StatCard({ label, value, icon, colorCls }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg mb-3 ${colorCls}`}>
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="text-3xl font-display font-bold text-slate-900">{value}</p>
    </div>
  )
}

interface HRStatsProps {
  activeJobs: number
  totalApps: number
  shortlisted: number
  todayApps: number
}

export default function HRStats({ activeJobs, totalApps, shortlisted, todayApps }: HRStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Active Jobs"        value={activeJobs}   icon="📋" colorCls="bg-blue-50 text-blue-700" />
      <StatCard label="Total Applications" value={totalApps}    icon="📨" colorCls="bg-violet-50 text-violet-700" />
      <StatCard label="Shortlisted"        value={shortlisted}  icon="⭐" colorCls="bg-emerald-50 text-emerald-700" />
      <StatCard label="Today's New"        value={todayApps}    icon="🆕" colorCls="bg-amber-50 text-amber-700" />
    </div>
  )
}
