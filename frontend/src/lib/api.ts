import axios, { AxiosInstance } from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const api: AxiosInstance = axios.create({ baseURL: BASE_URL })

// Attach JWT token from cookie to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/)
    if (match) config.headers.Authorization = `Bearer ${decodeURIComponent(match[1])}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshMatch = document.cookie.match(/(?:^|;\s*)refresh_token=([^;]+)/)
        if (refreshMatch) {
          const { data } = await axios.post(`${BASE_URL}/token/refresh/`, {
            refresh: decodeURIComponent(refreshMatch[1]),
          })
          setCookie('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        }
      } catch {
        clearAuthCookies()
        if (typeof window !== 'undefined') window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

export function setCookie(name: string, value: string, days = 30) {
  if (typeof document === 'undefined') return
  const d = new Date()
  d.setTime(d.getTime() + days * 86400000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Strict`
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return m ? decodeURIComponent(m[1]) : null
}

export function clearAuthCookies() {
  const past = 'Thu, 01 Jan 1970 00:00:00 UTC'
  if (typeof document === 'undefined') return
  ;['access_token', 'refresh_token', 'user_role'].forEach(name => {
    document.cookie = `${name}=;expires=${past};path=/`
  })
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  registerApplicant: (d: any) => api.post('/auth/register/applicant/', d),
  registerHR:        (d: any) => api.post('/auth/register/hr/', d),
  login:             (d: any) => api.post('/auth/login/', d),
  logout:            (d: any) => api.post('/auth/logout/', d),
  profile:           ()       => api.get('/auth/profile/'),
  updateProfile:     (d: any) => api.patch('/auth/profile/', d),
  changePassword:    (d: any) => api.post('/auth/change-password/', d),
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobsAPI = {
  list:     (params?: any)       => api.get('/jobs/', { params }),
  get:      (id: number)         => api.get(`/jobs/${id}/`),
  create:   (d: any)             => api.post('/jobs/', d),
  update:   (id: number, d: any) => api.patch(`/jobs/${id}/`, d),
  delete:   (id: number)         => api.delete(`/jobs/${id}/`),
  stats:    (id: number)         => api.get(`/jobs/${id}/stats/`),
  myJobs:   ()                   => api.get('/jobs/my_jobs/'),
}

// ── Applications ──────────────────────────────────────────────────────────────
export const applicationsAPI = {
  list:         (params?: any)   => api.get('/applications/', { params }),
  create:       (d: any)         => api.post('/applications/', d),
  get:          (id: number)     => api.get(`/applications/${id}/`),
  byJob:        (jobId: number, date?: string) =>
                  api.get('/applications/by_job/', { params: { job_id: jobId, date: date || undefined } }),
  dailySummary: (jobId: number)  => api.get('/applications/daily_summary/', { params: { job_id: jobId } }),
  updateStatus: (id: number, d: any) => api.patch(`/applications/${id}/update_status/`, d),
  withdraw:     (id: number)     => api.post(`/applications/${id}/withdraw/`),
  delete:       (id: number)     => api.delete(`/applications/${id}/`),
}

// ── Shortlist ─────────────────────────────────────────────────────────────────
export const shortlistAPI = {
  get: (jobId?: number, minScore?: number, rec?: string) =>
    api.get('/shortlist/', { params: { job_id: jobId, min_score: minScore, recommendation: rec } }),
  bulkShortlist: (jobId: number, threshold: number) =>
    api.post('/shortlist/', { job_id: jobId, threshold }),
}

export default api
