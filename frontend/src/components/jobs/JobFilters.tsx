'use client'

interface JobFiltersProps {
  search: string
  jobType: string
  expLevel: string
  onSearch: (v: string) => void
  onJobType: (v: string) => void
  onExpLevel: (v: string) => void
  heroStyle?: boolean
}

export default function JobFilters({
  search, jobType, expLevel, onSearch, onJobType, onExpLevel, heroStyle,
}: Readonly<JobFiltersProps>) {
  const inputCls = heroStyle
    ? `w-full px-4 py-3 rounded-xl text-sm font-semibold
       bg-white/95 text-slate-800 placeholder-slate-400
       border border-white/60 outline-none
       focus:ring-2 focus:ring-white/60 focus:border-white
       transition-all shadow-sm`
    : 'input'

  const selectCls = heroStyle
    ? `${inputCls} cursor-pointer appearance-none pr-10
       bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M4.22%206.28a.75.75%200%200%201%201.06%200L8%208.94l2.72-2.66a.75.75%200%201%201%201.06%201.06l-3.25%203.18a.75.75%200%200%201-1.06%200L4.22%207.34a.75.75%200%200%201%200-1.06z%22%2F%3E%3C%2Fsvg%3E")]
       bg-[length:1.25rem] bg-no-repeat bg-[right_0.75rem_center]`
    : 'select'

  return (
    <div className={`flex flex-col sm:flex-row gap-2 sm:gap-3 ${heroStyle ? 'p-2 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20' : ''}`}>
      <div className="relative flex-1">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400"
             fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text" value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search by title, skill, department…"
          className={`${inputCls} pl-10`}
        />
      </div>
      <select value={jobType} onChange={e => onJobType(e.target.value)} className={`${selectCls} sm:w-44`}>
        <option value="">All Types</option>
        {[['FULL_TIME','Full Time'],['PART_TIME','Part Time'],['CONTRACT','Contract'],
          ['INTERNSHIP','Internship'],['REMOTE','Remote']].map(([v,l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <select value={expLevel} onChange={e => onExpLevel(e.target.value)} className={`${selectCls} sm:w-36`}>
        <option value="">All Levels</option>
        {[['ENTRY','Entry'],['MID','Mid'],['SENIOR','Senior'],['LEAD','Lead']].map(([v,l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  )
}
