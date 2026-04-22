'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { jobsAPI } from '@/lib/api'
import Link from 'next/link'
import Navbar from '@/components/shared/Navbar'
import ErrorAlert from '@/components/shared/ErrorAlert'
import FormField from '@/components/ui/FormField'
import SkillInput from '@/components/ui/SkillInput'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

const QUICK_SKILLS = ['Python','React','Node.js','Django','AWS','TypeScript','PostgreSQL',
                      'Docker','Java','Machine Learning','Go','Kubernetes','SQL','MongoDB']

export default function PostJobPage() {
  const { user, isHR, isApplicant, loading: authLoading } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({
    title: '', department: '', location: '',
    job_type: 'FULL_TIME', experience_level: 'MID',
    description: '', requirements: '', responsibilities: '',
    salary_min: '', salary_max: '', salary_currency: 'INR',
    openings: 1, deadline: '', status: 'ACTIVE',
  })
  const [skills, setSkills]   = useState<string[]>([])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (authLoading) return
    if (isApplicant) router.replace('/jobs')
    if (!user && !isHR) router.replace('/auth/login')
  }, [user, isHR, isApplicant, authLoading])

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title || !form.department || !form.location || !form.description || !form.requirements || !form.responsibilities) {
      setError('Please fill in all required fields.'); return
    }
    setSaving(true)
    try {
      const { data } = await jobsAPI.create({
        ...form,
        salary_min:      form.salary_min ? Number(form.salary_min) : null,
        salary_max:      form.salary_max ? Number(form.salary_max) : null,
        openings:        Number(form.openings),
        skills_required: skills,
        deadline:        form.deadline || null,
      })
      router.push(`/hr/jobs/${data.id}`)
    } catch (err: any) {
      const d = err?.response?.data
      setError(typeof d === 'object' ? Object.values(d).flat().join('. ') : 'Failed to post job.')
    } finally { setSaving(false) }
  }

  if (!isHR) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="hr" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/hr/jobs" className="hover:text-violet-600 transition-colors">Jobs</Link>
          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-700 font-medium">Post a Job</span>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mb-6">Post a New Job</h1>

        {error && <ErrorAlert message={error} onClose={() => setError('')} className="mb-5" />}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Basic Info */}
          <div className="card p-6 space-y-4">
            <h2 className="font-display font-bold text-slate-900 text-lg">Basic Information</h2>

            <FormField label="Job Title" required>
              <input type="text" required value={form.title} onChange={set('title')}
                placeholder="e.g. Senior Backend Engineer" className="input-hr" />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Department" required>
                <input type="text" required value={form.department} onChange={set('department')}
                  placeholder="Engineering" className="input-hr" />
              </FormField>
              <FormField label="Location" required>
                <input type="text" required value={form.location} onChange={set('location')}
                  placeholder="Bengaluru / Remote" className="input-hr" />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Job Type">
                <select value={form.job_type} onChange={set('job_type')} className="select-hr">
                  {[['FULL_TIME','Full Time'],['PART_TIME','Part Time'],['CONTRACT','Contract'],
                    ['INTERNSHIP','Internship'],['REMOTE','Remote']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Experience Level">
                <select value={form.experience_level} onChange={set('experience_level')} className="select-hr">
                  <option value="ENTRY">Entry (0–2 yrs)</option>
                  <option value="MID">Mid (2–5 yrs)</option>
                  <option value="SENIOR">Senior (5–8 yrs)</option>
                  <option value="LEAD">Lead (8+ yrs)</option>
                </select>
              </FormField>
              <FormField label="Openings">
                <input type="number" min={1} value={form.openings}
                  onChange={e => setForm(p => ({ ...p, openings: Number(e.target.value) }))}
                  className="input-hr" />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Min Salary (₹)">
                <input type="number" value={form.salary_min} onChange={set('salary_min')}
                  placeholder="600000" className="input-hr" />
              </FormField>
              <FormField label="Max Salary (₹)">
                <input type="number" value={form.salary_max} onChange={set('salary_max')}
                  placeholder="1200000" className="input-hr" />
              </FormField>
              <FormField label="Application Deadline">
                <input type="date" value={form.deadline} onChange={set('deadline')} className="input-hr" />
              </FormField>
            </div>
          </div>

          {/* Job Description */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-slate-900 text-lg">Job Description</h2>
              <span className="badge badge-violet text-xs">Used for AI resume scoring</span>
            </div>

            {[
              { key: 'description',      label: 'About the Role',               rows: 4, placeholder: 'Describe the role, its impact, and the team…' },
              { key: 'responsibilities', label: 'Responsibilities',             rows: 4, placeholder: 'Day-to-day tasks and key responsibilities…' },
              { key: 'requirements',     label: 'Requirements & Qualifications', rows: 4, placeholder: 'Must-have qualifications, experience, certifications…' },
            ].map(f => (
              <FormField key={f.key} label={f.label} required>
                <textarea
                  required rows={f.rows}
                  value={(form as any)[f.key]}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                  className="textarea-hr"
                />
              </FormField>
            ))}
          </div>

          {/* Skills */}
          <div className="card p-6">
            <h2 className="font-display font-bold text-slate-900 text-lg mb-4">Required Skills</h2>
            <SkillInput
              skills={skills}
              onChange={setSkills}
              placeholder="Type a skill and press Enter"
              quickSuggestions={QUICK_SKILLS}
              chipVariant="violet"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="button" onClick={() => router.back()}
              className="btn-secondary flex-1 sm:flex-none sm:px-6 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-hr flex-1 justify-center py-3">
              {saving ? <><LoadingSpinner size="sm" color="white" /> Publishing…</> : '🚀 Publish Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
