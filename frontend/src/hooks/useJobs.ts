'use client'
import { useState, useEffect, useCallback } from 'react'
import { jobsAPI } from '@/lib/api'
import type { Job } from '@/types'

export function useJobsList() {
  const [jobs, setJobs]       = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [jobType, setJobType] = useState('')
  const [expLevel, setExpLevel] = useState('')

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await jobsAPI.list({
        search:           search || undefined,
        job_type:         jobType || undefined,
        experience_level: expLevel || undefined,
        status:           'ACTIVE',
      })
      setJobs(data.results ?? data)
    } catch { setJobs([]) }
    finally { setLoading(false) }
  }, [search, jobType, expLevel])

  useEffect(() => {
    const t = setTimeout(fetchJobs, 300)
    return () => clearTimeout(t)
  }, [fetchJobs])

  return { jobs, loading, search, jobType, expLevel, setSearch, setJobType, setExpLevel }
}

export function useJob(id: number) {
  const [job, setJob]         = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    setLoading(true)
    jobsAPI.get(id)
      .then(r => setJob(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  return { job, loading, error }
}
