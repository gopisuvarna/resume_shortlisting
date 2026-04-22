'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useJob } from '@/hooks/useJobs'
import { applicationsAPI } from '@/lib/api'
import Link from 'next/link'
import Navbar from '@/components/shared/Navbar'
import ErrorAlert from '@/components/shared/ErrorAlert'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import SkillInput from '@/components/ui/SkillInput'
import FormField from '@/components/ui/FormField'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

type Step = 'details' | 'form' | 'done'

export default function JobDetailPage() {
  const { id }        = useParams<{ id: string }>()
  const { user, isHR } = useAuth()
  const router        = useRouter()
  const { job, loading, error } = useJob(Number(id))

  const [step, setStep]           = useState<Step>('details')
  const [appError, setAppError]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    cover_letter: '', years_of_experience: 0, current_company: '',
    current_role: '', notice_period_days: 30, expected_salary: '',
    linkedin_url: '', portfolio_url: '', skills_mentioned: [] as string[],
  })
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isHR) router.replace('/hr/dashboard')
  }, [isHR])

  useEffect(() => {
    if (error) router.push('/jobs')
  }, [error])

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setAppError('Please upload a PDF resume.'); return }
    setAppError(''); setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('job', String(id)); fd.append('resume_file', file)
      fd.append('cover_letter', form.cover_letter)
      fd.append('years_of_experience', String(form.years_of_experience))
      fd.append('current_company', form.current_company)
      fd.append('current_role', form.current_role)
      fd.append('notice_period_days', String(form.notice_period_days))
      if (form.expected_salary) fd.append('expected_salary', form.expected_salary)
      fd.append('linkedin_url', form.linkedin_url)
      fd.append('portfolio_url', form.portfolio_url)
      fd.append('skills_mentioned', JSON.stringify(form.skills_mentioned))
      await applicationsAPI.create(fd)
      setStep('done')
    } catch (err: any) {
      const d = err?.response?.data
      setAppError(typeof d === 'object'
        ? (d.resume_file ? String(d.resume_file) : Object.values(d).flat().join(' '))
        : 'Failed to submit. Please try again.')
    } finally { setSubmitting(false) }
  }

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  if (loading) return <PageLoader />
  if (!job) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="applicant" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/jobs" className="hover:text-indigo-600 transition-colors">Jobs</Link>
          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-700 font-medium truncate">{job.title}</span>
        </div>

        {/* ── Details step ── */}
        {step === 'details' && (
          <div className="space-y-4 fade-in">
            <div className="card p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mb-3">{job.title}</h1>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-500 mb-4">
                    <span className="font-semibold text-slate-700">{job.department}</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {job.location}
                    </span>
                    <span>{job.job_type_display || job.job_type?.replace('_',' ')}</span>
                    {job.salary_range && <span className="text-emerald-600 font-semibold">{job.salary_range}</span>}
                  </div>
                  {job.skills_required?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.skills_required.map(s => <span key={s} className="skill-chip">{s}</span>)}
                    </div>
                  )}
                </div>
                <div className="sm:text-right text-sm text-slate-400 shrink-0">
                  <p className="font-semibold text-slate-600">{job.openings} opening{job.openings !== 1 ? 's' : ''}</p>
                  <p>{job.total_applicants} applied</p>
                  {job.deadline && (
                    <p className="text-amber-600 font-medium mt-1">
                      Closes {new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {[
              { title: 'About the Role', text: job.description },
              { title: 'Responsibilities', text: job.responsibilities },
              { title: 'Requirements', text: job.requirements },
            ].filter(s => s.text).map(s => (
              <div key={s.title} className="card p-6 sm:p-8">
                <h2 className="font-display font-bold text-slate-900 text-lg mb-4">{s.title}</h2>
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{s.text}</p>
              </div>
            ))}

            <div className="pt-2">
              {user ? (
                <button
                  onClick={() => setStep('form')}
                  className="btn-primary px-8 py-3 text-base"
                >
                  Apply for this Role →
                </button>
              ) : (
                <div className="card p-5 bg-amber-50 border-amber-200 text-sm text-amber-800">
                  <Link href="/auth/login" className="font-semibold underline">Sign in</Link>
                  {' '}or{' '}
                  <Link href="/auth/register" className="font-semibold underline">create an account</Link>
                  {' '}to apply.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Application form step ── */}
        {step === 'form' && (
          <div className="card p-6 sm:p-8 fade-in">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => { setStep('details'); setAppError('') }}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="font-display font-bold text-slate-900 text-xl">Apply for {job.title}</h2>
            </div>

            {appError && <ErrorAlert message={appError} onClose={() => setAppError('')} className="mb-5" />}

            <form onSubmit={handleApply} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Current Company">
                  <input type="text" value={form.current_company} onChange={setF('current_company')}
                    placeholder="Infosys Ltd" className="input" />
                </FormField>
                <FormField label="Current Role">
                  <input type="text" value={form.current_role} onChange={setF('current_role')}
                    placeholder="Software Engineer" className="input" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Years of Experience">
                  <input type="number" min={0} max={50} value={form.years_of_experience}
                    onChange={e => setForm(p => ({ ...p, years_of_experience: Number(e.target.value) }))}
                    className="input" />
                </FormField>
                <FormField label="Notice Period (days)">
                  <input type="number" min={0} max={180} value={form.notice_period_days}
                    onChange={e => setForm(p => ({ ...p, notice_period_days: Number(e.target.value) }))}
                    className="input" />
                </FormField>
                <FormField label="Expected Salary (₹)">
                  <input type="number" min={0} value={form.expected_salary}
                    onChange={setF('expected_salary')} placeholder="800000" className="input" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="LinkedIn URL">
                  <input type="url" value={form.linkedin_url} onChange={setF('linkedin_url')}
                    placeholder="https://linkedin.com/in/..." className="input" />
                </FormField>
                <FormField label="Portfolio / GitHub">
                  <input type="url" value={form.portfolio_url} onChange={setF('portfolio_url')}
                    placeholder="https://github.com/..." className="input" />
                </FormField>
              </div>

              <FormField label="Your Key Skills">
                <SkillInput
                  skills={form.skills_mentioned}
                  onChange={s => setForm(p => ({ ...p, skills_mentioned: s }))}
                  placeholder="Type a skill and press Enter"
                />
              </FormField>

              <FormField label="Cover Letter">
                <textarea rows={5} value={form.cover_letter}
                  onChange={setF('cover_letter')}
                  placeholder="Tell us why you are a great fit for this role…"
                  className="textarea" />
              </FormField>

              <FormField label="Resume (PDF only)" required>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors text-center ${
                    file ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]) }} />
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-indigo-700">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold text-sm">{file.name}</span>
                      <span className="text-xs text-indigo-400">({(file.size/1024).toFixed(0)} KB)</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-slate-500 text-sm font-medium">Click to select PDF resume</p>
                      <p className="text-slate-400 text-xs mt-1">Max 5MB</p>
                    </>
                  )}
                </div>
              </FormField>

              <button type="submit" disabled={submitting} className="w-full btn-primary py-3 text-base justify-center">
                {submitting ? <><LoadingSpinner size="sm" color="white" /> Submitting…</> : 'Submit Application'}
              </button>
            </form>
          </div>
        )}

        {/* ── Done step ── */}
        {step === 'done' && (
          <div className="card p-12 text-center max-w-lg mx-auto fade-in">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 ring-1 ring-emerald-200">
              <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
            <p className="text-slate-500 mb-2">Your resume has been saved and your application is under review.</p>
            <p className="text-slate-400 text-sm mb-8">Track your application status on the My Applications page.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/my-applications" className="btn-primary px-6">Track My Applications</Link>
              <Link href="/jobs" className="btn-secondary px-6">Browse More Jobs</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
