'use client'
import { useState, useEffect } from 'react'
import { applicationsAPI } from '@/lib/api'
import type { Application } from '@/types'

export function useMyApplications(enabled: boolean) {
  const [apps, setApps]       = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) return
    applicationsAPI.list()
      .then(r => setApps(r.data.results ?? r.data))
      .catch(() => setApps([]))
      .finally(() => setLoading(false))
  }, [enabled])

  const withdraw = async (id: number) => {
    await applicationsAPI.withdraw(id)
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: 'WITHDRAWN', status_display: 'Withdrawn' } : a))
  }

  const deleteApp = async (id: number) => {
    await applicationsAPI.delete(id)
    setApps(prev => prev.filter(a => a.id !== id))
  }

  return { apps, loading, withdraw, deleteApp }
}

export function useJobApplications(jobId: number) {
  const [apps, setApps]             = useState<Application[]>([])
  const [loading, setLoading]       = useState(false)
  const [selectedDate, setSelectedDate] = useState('')

  const loadApps = async (date: string) => {
    setLoading(true)
    try {
      const { data } = await applicationsAPI.byJob(jobId, date || undefined)
      setApps(data)
    } catch { setApps([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadApps(selectedDate) }, [selectedDate, jobId])

  const updateStatus = async (appId: number, status: string) => {
    await applicationsAPI.updateStatus(appId, { status })
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a))
  }

  const removeApp = (appId: number) => {
    setApps(prev => prev.filter(a => a.id !== appId))
  }

  return { apps, loading, selectedDate, setSelectedDate, updateStatus, removeApp, reload: loadApps }
}
