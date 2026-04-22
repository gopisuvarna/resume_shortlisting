'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useMyApplications } from '@/hooks/useApplications'
import Navbar from '@/components/shared/Navbar'
import ApplicationCard from '@/components/jobs/ApplicationCard'
import { InlineLoader } from '@/components/shared/LoadingSpinner'
import Link from 'next/link'

const POSITIVE = ['SHORTLISTED','INTERVIEW','OFFERED','HIRED']

export default function MyApplicationsPage() {
  const { user, isHR, loading: authLoading } = useAuth()
  const router = useRouter()
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null)
  const [deletingId,    setDeletingId]    = useState<number | null>(null)

  useEffect(() => {
    if (authLoading) return          // wait until auth state is known
    if (isHR)  { router.replace('/hr/dashboard'); return }
    if (!user) { router.replace('/auth/login');   return }
  }, [user, isHR, authLoading])

  const { apps, loading, withdraw, deleteApp } = useMyApplications(!!user && !isHR && !authLoading)

  const handleWithdraw = async (id: number) => {
    if (!confirm('Withdraw this application? This cannot be undone.')) return
    setWithdrawingId(id)
    try { await withdraw(id) }
    catch (err: any) { alert(err?.response?.data?.error || 'Could not withdraw.') }
    finally { setWithdrawingId(null) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Permanently delete this application? This removes your data completely.')) return
    setDeletingId(id)
    try { await deleteApp(id) }
    catch (err: any) { alert(err?.response?.data?.error || 'Could not delete.') }
    finally { setDeletingId(null) }
  }

  const shortlisted = apps.filter(a => POSITIVE.includes(a.status))

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="applicant" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">My Applications</h1>
            <p className="text-slate-500 text-sm mt-1">{apps.length} application{apps.length !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/jobs" className="btn-secondary hidden sm:inline-flex">Browse Jobs</Link>
        </div>

        {/* Shortlist banner */}
        {shortlisted.length > 0 && (
          <div className="mb-6 p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-start gap-3 fade-in">
            <span className="text-2xl">🎊</span>
            <div>
              <p className="font-display font-bold text-emerald-800 text-sm">
                Congratulations! You've been shortlisted for {shortlisted.length} role{shortlisted.length > 1 ? 's' : ''}!
              </p>
              <p className="text-sm text-emerald-700 mt-0.5">The HR team will reach out to you soon. See details below.</p>
            </div>
          </div>
        )}

        {loading ? (
          <InlineLoader />
        ) : apps.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-display font-bold text-slate-700 mb-1.5">No applications yet</p>
            <p className="text-slate-400 text-sm mb-6">Apply to open positions and track them here</p>
            <Link href="/jobs" className="btn-primary px-6">Browse Open Positions</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map(app => (
              <ApplicationCard
                key={app.id}
                app={app}
                withdrawing={withdrawingId === app.id}
                deleting={deletingId === app.id}
                onWithdraw={handleWithdraw}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
