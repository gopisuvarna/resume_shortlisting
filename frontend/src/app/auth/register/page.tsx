'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authAPI, extractApiErrorMessage } from '@/lib/api'
import ErrorAlert from '@/components/shared/ErrorAlert'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import FormField from '@/components/ui/FormField'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    password: '', password2: '',
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
      await authAPI.registerApplicant(form)
      router.push('/auth/login?registered=1')
    } catch (error: unknown) {
      setError(extractApiErrorMessage(error, 'Registration failed. Please try again.', true))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-5 shadow-lg shadow-indigo-200/60">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Create Your Account</h1>
          <p className="text-slate-500 mt-1.5 text-sm">Join and start applying for jobs</p>
        </div>

        <div className="card p-7 sm:p-8">
          {error && <ErrorAlert message={error} onClose={() => setError('')} className="mb-5" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name" required>
                <input type="text" required value={form.first_name} onChange={set('first_name')}
                  placeholder="Riya" className="input" autoComplete="given-name" />
              </FormField>
              <FormField label="Last Name" required>
                <input type="text" required value={form.last_name} onChange={set('last_name')}
                  placeholder="Sharma" className="input" autoComplete="family-name" />
              </FormField>
            </div>

            <FormField label="Email Address" required>
              <input type="email" required value={form.email} onChange={set('email')}
                placeholder="riya@example.com" className="input" autoComplete="email" />
            </FormField>

            <FormField label="Phone Number">
              <input type="tel" value={form.phone} onChange={set('phone')}
                placeholder="+91 98765 43210" className="input" autoComplete="tel" />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Password" required>
                <input type="password" required value={form.password} onChange={set('password')}
                  placeholder="Min 8 characters" className="input" autoComplete="new-password" />
              </FormField>
              <FormField label="Confirm" required>
                <input type="password" required value={form.password2} onChange={set('password2')}
                  placeholder="Repeat password" className="input" autoComplete="new-password" />
              </FormField>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary py-3 text-base justify-center mt-1">
              {loading ? <><LoadingSpinner size="sm" color="white" /> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
