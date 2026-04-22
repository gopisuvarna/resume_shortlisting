export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: "HR" | "APPLICANT";
  phone: string;
  hr_department: string;
  company?: string;
  created_at: string;
}

export interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  job_type: string;
  job_type_display: string;
  experience_level: string;
  experience_display: string;
  description: string;
  requirements: string;
  responsibilities: string;
  skills_required: string[];
  salary_range: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  openings: number;
  status: string;
  deadline: string | null;
  company: string;
  total_applicants: number;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: number;
  job: number;
  job_title: string;
  job_department: string;
  job_location: string;
  job_type: string;
  status: string;
  status_display: string;
  is_shortlisted: boolean;
  status_message: string;
  cover_letter: string;
  years_of_experience: number;
  current_company: string;
  current_role: string;
  notice_period_days: number;
  expected_salary: number | null;
  linkedin_url: string;
  portfolio_url: string;
  skills_mentioned: string[];
  has_resume: boolean;
  applied_at: string;
  updated_at: string;
  // HR-only fields
  applicant_name?: string;
  applicant_email?: string;
  applicant_phone?: string;
  ai_score?: number | null; // Note: mapped from final_score
  nlp_score?: number | null;
  embedding_score?: number | null;
  llm_score?: number | null;
  ai_summary?: string;
  llm_explanation?: string;
  ai_matched_skills?: Array<string | { skill?: string; evidence?: string }>;
  ai_missing_skills?: string[];
  ai_recommendation?: string;
  resume_url?: string | null;
}

export interface Resume {
  id: number;
  application: number;
  file_url: string;
  original_filename: string;
  file_size: number;
  upload_date: string;
  is_parsed: boolean;
  parsed_skills: string[];
  parsed_exp_years: number | null;
  created_at: string;
}

export interface DaySummary {
  applied_at__date: string;
  total: number;
  shortlisted: number;
  scored: number;
}

export interface Tokens {
  access: string;
  refresh: string;
}
