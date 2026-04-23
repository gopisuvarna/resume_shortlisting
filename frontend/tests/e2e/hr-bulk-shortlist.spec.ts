import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const jobId = 42;

const job = {
  id: jobId,
  title: "Machine Learning Intern",
  department: "Engineering",
  location: "Hyderabad",
  job_type: "INTERNSHIP",
  job_type_display: "Internship",
  experience_level: "ENTRY",
  experience_display: "Entry",
  description: "Work on ML features.",
  requirements: "Python and NLP",
  responsibilities: "Support the team.",
  skills_required: ["Python", "NLP"],
  salary_range: null,
  salary_min: null,
  salary_max: null,
  salary_currency: "INR",
  openings: 1,
  status: "ACTIVE",
  deadline: null,
  company: "Nueve IT Solutions",
  total_applicants: 2,
  created_at: "2026-04-22T00:00:00Z",
  updated_at: "2026-04-22T00:00:00Z",
};

const hrProfile = {
  id: 1,
  email: "hr@example.com",
  first_name: "HR",
  last_name: "Manager",
  full_name: "HR Manager",
  role: "HR",
  phone: "9999999999",
  hr_department: "Engineering",
  created_at: "2026-04-20T00:00:00Z",
};

function makeApplication({
  id,
  name,
  score,
  status,
}: {
  id: number;
  name: string;
  score: number;
  status: string;
}) {
  return {
    id,
    job: jobId,
    job_title: job.title,
    job_department: job.department,
    job_location: job.location,
    job_type: job.job_type,
    status,
    status_display: status,
    is_shortlisted: status === "SHORTLISTED",
    status_message: "",
    cover_letter: "",
    years_of_experience: 0,
    current_company: "",
    current_role: "",
    notice_period_days: 30,
    expected_salary: null,
    linkedin_url: "",
    portfolio_url: "",
    skills_mentioned: ["Python"],
    has_resume: true,
    applied_at: "2026-04-22T09:00:00Z",
    updated_at: "2026-04-22T09:00:00Z",
    applicant_name: name,
    applicant_email: `${name.replace(/\s+/g, ".").toLowerCase()}@example.com`,
    applicant_phone: "9999999999",
    ai_score: score,
    nlp_score: score - 2,
    embedding_score: score - 1,
    llm_score: score,
    ai_summary: "Strong fit",
    llm_explanation: "Relevant background",
    ai_matched_skills: ["Python"],
    ai_missing_skills: [],
    ai_recommendation: "YES",
    resume_url: "https://example.com/resume.pdf",
  };
}

async function mockHrPage(page: Page, options: {
  apps: ReturnType<typeof makeApplication>[];
  shortlistResponse: { shortlisted: number; reverted: number; threshold: number; message: string };
  updatedApps?: ReturnType<typeof makeApplication>[];
}) {
  let apps = options.apps;
  const initialDate = "2026-04-22";

  await page.context().addCookies([
    {
      name: "access_token",
      value: "test-token",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  await page.route("**/api/auth/profile/", async (route) => {
    await route.fulfill({ json: hrProfile });
  });

  await page.route(`**/api/jobs/${jobId}/`, async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({ json: job });
      return;
    }
    await route.fulfill({ json: job });
  });

  await page.route("**/api/applications/daily_summary/**", async (route) => {
    const shortlisted = apps.filter((app) => app.status === "SHORTLISTED").length;
    await route.fulfill({
      json: [
        {
          applied_at__date: initialDate,
          total: apps.length,
          shortlisted,
          scored: apps.filter((app) => app.ai_score != null).length,
        },
      ],
    });
  });

  await page.route("**/api/applications/by_job/**", async (route) => {
    await route.fulfill({ json: apps });
  });

  await page.route("**/api/shortlist/", async (route) => {
    apps = options.updatedApps ?? apps;
    await route.fulfill({ json: options.shortlistResponse });
  });
}

test("shows professional notice when candidates were already shortlisted", async ({
  page,
}) => {
  await mockHrPage(page, {
    apps: [
      makeApplication({ id: 1, name: "Gopi Suvarna", score: 86, status: "SHORTLISTED" }),
      makeApplication({ id: 2, name: "Vignesh Yallapu", score: 84, status: "SHORTLISTED" }),
    ],
    shortlistResponse: {
      shortlisted: 0,
      reverted: 0,
      threshold: 65,
      message: "No new candidates were shortlisted.",
    },
  });

  await page.goto(`/hr/jobs/${jobId}`);

  await expect(page.getByText("Machine Learning Intern")).toBeVisible();
  await page.getByRole("button", { name: /bulk shortlist/i }).click();

  await expect(page.getByText("Already shortlisted")).toBeVisible();
  await expect(
    page.getByText(/already meet the cutoff of 65/i),
  ).toBeVisible();
});

test("shows success notice when bulk shortlist newly shortlists candidates", async ({
  page,
}) => {
  await mockHrPage(page, {
    apps: [
      makeApplication({ id: 1, name: "Asha Rao", score: 88, status: "REVIEWING" }),
      makeApplication({ id: 2, name: "Kiran Das", score: 52, status: "REVIEWING" }),
    ],
    updatedApps: [
      makeApplication({ id: 1, name: "Asha Rao", score: 88, status: "SHORTLISTED" }),
      makeApplication({ id: 2, name: "Kiran Das", score: 52, status: "REVIEWING" }),
    ],
    shortlistResponse: {
      shortlisted: 1,
      reverted: 0,
      threshold: 65,
      message: "1 candidate shortlisted.",
    },
  });

  await page.goto(`/hr/jobs/${jobId}`);

  await expect(page.getByText("Machine Learning Intern")).toBeVisible();
  await page.getByRole("button", { name: /bulk shortlist/i }).click();

  await expect(page.getByText("Bulk shortlist updated")).toBeVisible();
  await expect(
    page.getByText(/1 new candidate\(s\) were shortlisted at cutoff 65/i),
  ).toBeVisible();
});
