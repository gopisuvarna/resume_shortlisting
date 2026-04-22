'use client'
import { useState } from 'react'
import { jobsAPI, applicationsAPI } from '@/lib/api'
import type { Job } from '@/types'

interface Stats { totalApps: number; shortlisted: number; todayApps: number }

export function useHRDashboard() {
  const [jobs, setJobs]       = useState<Job[]>([])
  const [stats, setStats]     = useState<Stats>({ totalApps: 0, shortlisted: 0, todayApps: 0 })
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await jobsAPI.list()
      const list: Job[] = data.results ?? data
      setJobs(list)

      let totalApps = 0, shortlisted = 0, todayApps = 0
      const today = new Date().toISOString().split('T')[0]

      for (const job of list.slice(0, 8)) {
        try {
          const { data: st } = await jobsAPI.stats(job.id)
          totalApps   += st.total
          shortlisted += st.by_status?.SHORTLISTED ?? 0
          const { data: ds } = await applicationsAPI.dailySummary(job.id)
          todayApps += ds.find((d: any) => d.applied_at__date === today)?.total ?? 0
        } catch {}
      }
      setStats({ totalApps, shortlisted, todayApps })
    } catch {} finally { setLoading(false) }
  }

  return { jobs, stats, loading, loadData }
}
