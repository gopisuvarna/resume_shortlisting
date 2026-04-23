'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authAPI, extractApiErrorMessage } from '@/lib/api'
import ErrorAlert from '@/components/shared/ErrorAlert'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import FormField from '@/components/ui/FormField'

export default function HRRegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    hr_department: '', invite_code: '', password: '', password2: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.password2) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await authAPI.registerHR(form)
      router.push('/auth/login?registered=hr')
    } catch (error: unknown) {
      setError(extractApiErrorMessage(error, 'Registration failed. Please try again.', true))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-violet-600 rounded-2xl mb-5 shadow-lg shadow-violet-200/60">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">HR Registration</h1>
          <p className="text-slate-500 mt-1.5 text-sm">Create your recruiter account</p>
        </div>

        <div className="card p-7 sm:p-8">
          {error && <ErrorAlert message={error} onClose={() => setError('')} className="mb-5" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name" required>
                <input type="text" required value={form.first_name} onChange={set('first_name')}
                  placeholder="Priya" className="input-hr" autoComplete="given-name" />
              </FormField>
              <FormField label="Last Name" required>
                <input type="text" required value={form.last_name} onChange={set('last_name')}
                  placeholder="Nair" className="input-hr" autoComplete="family-name" />
              </FormField>
            </div>

            <FormField label="Work Email" required>
              <input type="email" required value={form.email} onChange={set('email')}
                placeholder="priya@company.com" className="input-hr" autoComplete="email" />
            </FormField>

            <FormField label="Phone">
              <input type="tel" value={form.phone} onChange={set('phone')}
                placeholder="+91 98765 43210" className="input-hr" autoComplete="tel" />
            </FormField>

            <FormField label="Department">
              <input type="text" value={form.hr_department} onChange={set('hr_department')}
                placeholder="Talent Acquisition" className="input-hr" />
            </FormField>

            <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
              <label htmlFor="invite_code" className="block text-sm font-semibold text-violet-800 mb-1.5">Invite Code</label>
              <input id="invite_code" type="text" value={form.invite_code} onChange={set('invite_code')}
                placeholder="Provided by your admin"
                className="w-full px-4 py-2.5 border border-violet-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
              <p className="mt-1.5 text-xs text-violet-600">Leave blank in development.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Password" required>
                <input type="password" required value={form.password} onChange={set('password')}
                  placeholder="Min 8 characters" className="input-hr" autoComplete="new-password" />
              </FormField>
              <FormField label="Confirm" required>
                <input type="password" required value={form.password2} onChange={set('password2')}
                  placeholder="Repeat password" className="input-hr" autoComplete="new-password" />
              </FormField>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-hr py-3 text-base justify-center mt-1">
              {loading ? <><LoadingSpinner size="sm" color="white" /> Creating account…</> : 'Create HR Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            Already registered?{' '}
            <Link href="/auth/login" className="text-violet-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
