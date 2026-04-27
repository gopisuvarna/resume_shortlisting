import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const api: AxiosInstance = axios.create({ baseURL: BASE_URL });

type ApiPayload = Record<string, unknown> | FormData;
type ApiQueryParamValue = string | number | boolean | undefined;
type ApiQueryParams = Record<string, ApiQueryParamValue>;
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const AUTH_COOKIE_NAMES = [
  "access_token",
  "refresh_token",
  "user_role",
] as const;

function getCookieValue(cookieName: string): string | null {
  if (typeof document === "undefined") return null;

  const cookiePrefix = `${cookieName}=`;
  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim();
    if (!trimmedCookie.startsWith(cookiePrefix)) continue;
    return decodeURIComponent(trimmedCookie.slice(cookiePrefix.length));
  }

  return null;
}

function setAuthorizationHeader(
  config: InternalAxiosRequestConfig,
  token: string,
) {
  if (!config.headers) return;
  config.headers.Authorization = `Bearer ${token}`;
}

function redirectToLogin() {
  if (globalThis.window) {
    globalThis.window.location.href = "/auth/login";
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getCookieValue("refresh_token");
  if (!refreshToken) return null;

  const { data } = await axios.post(`${BASE_URL}/token/refresh/`, {
    refresh: refreshToken,
  });

  return data.access;
}

async function retryWithFreshAccessToken(
  original: RetryableRequestConfig,
): Promise<unknown> {
  const accessToken = await refreshAccessToken();
  if (!accessToken) return null;

  setCookie("access_token", accessToken);
  setAuthorizationHeader(original, accessToken);
  return api(original);
}

api.interceptors.request.use((config) => {
  const accessToken = getCookieValue("access_token");
  if (accessToken) setAuthorizationHeader(config, accessToken);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetryableRequestConfig | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const retryResponse = await retryWithFreshAccessToken(original);
        if (retryResponse) return retryResponse;
      } catch {
        clearAuthCookies();
        redirectToLogin();
      }
    }

    throw error;
  },
);

export function setCookie(name: string, value: string, days = 30) {
  if (typeof document === "undefined") return;
  const expiry = new Date();
  expiry.setTime(expiry.getTime() + days * 86400000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expiry.toUTCString()};path=/;SameSite=Strict`;
}

export function getCookie(name: string): string | null {
  return getCookieValue(name);
}

export function clearAuthCookies() {
  if (typeof document === "undefined") return;
  const past = "Thu, 01 Jan 1970 00:00:00 UTC";
  AUTH_COOKIE_NAMES.forEach((name) => {
    document.cookie = `${name}=;expires=${past};path=/`;
  });
}

function flattenErrorValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => flattenErrorValue(item)).join(", ");
  }
  return String(value);
}

export function extractApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
  includeFieldNames = false,
): string {
  if (!axios.isAxiosError(error)) {
    return fallbackMessage;
  }

  const data = (error as AxiosError<unknown>).response?.data;
  if (typeof data === "string") {
    return data;
  }
  if (!data || typeof data !== "object") {
    return fallbackMessage;
  }

  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) {
    return fallbackMessage;
  }

  return (
    entries
      .map(([key, value]) => {
        const message = flattenErrorValue(value);
        if (!includeFieldNames || key === "non_field_errors") {
          return message;
        }
        return `${key}: ${message}`;
      })
      .join("\n")
      .trim() || fallbackMessage
  );
}

export const authAPI = {
  registerApplicant: (data: ApiPayload) =>
    api.post("/auth/register/applicant/", data),
  registerHR: (data: ApiPayload) => api.post("/auth/register/hr/", data),
  login: (data: ApiPayload) => api.post("/auth/login/", data),
  logout: (data: ApiPayload) => api.post("/auth/logout/", data),
  profile: () => api.get("/auth/profile/"),
  updateProfile: (data: ApiPayload) => api.patch("/auth/profile/", data),
  changePassword: (data: ApiPayload) =>
    api.post("/auth/change-password/", data),
};

export const jobsAPI = {
  list: (params?: ApiQueryParams) => api.get("/jobs/", { params }),
  get: (id: number) => api.get(`/jobs/${id}/`),
  create: (data: ApiPayload) => api.post("/jobs/", data),
  update: (id: number, data: ApiPayload) => api.patch(`/jobs/${id}/`, data),
  delete: (id: number) => api.delete(`/jobs/${id}/`),
  stats: (id: number) => api.get(`/jobs/${id}/stats/`),
  myJobs: () => api.get("/jobs/my_jobs/"),
};

export const applicationsAPI = {
  list: (params?: ApiQueryParams) => api.get("/applications/", { params }),
  create: (data: ApiPayload) => api.post("/applications/", data),
  get: (id: number) => api.get(`/applications/${id}/`),
  byJob: (jobId: number, date?: string) =>
    api.get("/applications/by_job/", {
      params: { job_id: jobId, date: date || undefined },
    }),
  dailySummary: (jobId: number) =>
    api.get("/applications/daily_summary/", { params: { job_id: jobId } }),
  updateStatus: (id: number, data: ApiPayload) =>
    api.patch(`/applications/${id}/update_status/`, data),
  withdraw: (id: number) => api.post(`/applications/${id}/withdraw/`),
  delete: (id: number) => api.delete(`/applications/${id}/`),
};

export const shortlistAPI = {
  get: (jobId?: number, minScore?: number, recommendation?: string) =>
    api.get("/shortlist/", {
      params: {
        job_id: jobId,
        min_score: minScore,
        recommendation,
      },
    }),
  bulkShortlist: (jobId: number, threshold: number) =>
    api.post("/shortlist/", { job_id: jobId, threshold }),
};

export default api;
