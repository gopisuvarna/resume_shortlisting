import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ priority, ...props }: Record<string, unknown>) => (
    <img {...props} alt={String(props.alt ?? "")} />
  ),
}));

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/jobs"),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

import RegisterFormShell from "@/components/auth/RegisterFormShell";
import HRStats, { StatCard } from "@/components/hr/HRStats";
import ApplicationCard from "@/components/jobs/ApplicationCard";
import JobCard from "@/components/jobs/JobCard";
import JobFilters from "@/components/jobs/JobFilters";
import Navbar from "@/components/shared/Navbar";
import { useAuth } from "@/hooks/useAuth";

function visitTree(node: React.ReactNode, visitor: (element: React.ReactElement) => void) {
  if (!React.isValidElement(node)) return;
  visitor(node);
  React.Children.forEach(node.props.children, (child) => visitTree(child, visitor));
}

describe("feature components", () => {
  const sampleJob = {
    id: 7,
    title: "Platform Engineer",
    department: "Engineering",
    location: "Bengaluru",
    job_type: "FULL_TIME",
    job_type_display: "Full Time",
    experience_level: "MID",
    experience_display: "Mid",
    description: "Build systems",
    requirements: "Python",
    responsibilities: "Ship product",
    skills_required: ["Python", "Django", "SQL", "AWS", "Docker", "Redis"],
    salary_range: "12-18 LPA",
    salary_min: 1200000,
    salary_max: 1800000,
    salary_currency: "INR",
    openings: 2,
    status: "ACTIVE",
    deadline: "2026-05-20T00:00:00Z",
    company: "Nueve",
    total_applicants: 11,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-02T00:00:00Z",
  };

  const sampleApp = {
    id: 5,
    job: 7,
    job_title: "Platform Engineer",
    job_department: "Engineering",
    job_location: "Remote",
    job_type: "FULL_TIME",
    status: "SHORTLISTED",
    status_display: "Shortlisted",
    is_shortlisted: true,
    status_message: "You are moving to the next stage.",
    cover_letter: "",
    years_of_experience: 4,
    current_company: "Acme",
    current_role: "Engineer",
    notice_period_days: 30,
    expected_salary: 1800000,
    linkedin_url: "",
    portfolio_url: "",
    skills_mentioned: ["Python"],
    has_resume: true,
    applied_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-02T00:00:00Z",
  };

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        full_name: "Ada Lovelace",
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        hr_department: "Talent",
      },
      logout: jest.fn(),
    });
  });

  test("RegisterFormShell renders error and loading states", () => {
    const html = renderToStaticMarkup(
      <RegisterFormShell
        title="Create account"
        subtitle="Start your journey"
        icon={<span>Icon</span>}
        iconContainerClassName="icon-wrap"
        cardClassName="card-shell"
        buttonClassName="btn-shell"
        signInLinkClassName="sign-in-link"
        signInHref="/auth/login"
        signInLabel="Already have an account?"
        submitLabel="Create"
        loadingLabel="Creating"
        error="Something went wrong"
        onCloseError={() => undefined}
        loading
        onSubmit={(event) => event.preventDefault()}
      >
        <input type="email" />
      </RegisterFormShell>,
    );

    expect(html).toContain("Something went wrong");
    expect(html).toContain("Creating");
    expect(html).toContain("Sign in");
  });

  test("RegisterFormShell renders submit label when not loading", () => {
    const html = renderToStaticMarkup(
      <RegisterFormShell
        title="Create account"
        subtitle="Start your journey"
        icon={<span>Icon</span>}
        iconContainerClassName="icon-wrap"
        cardClassName="card-shell"
        buttonClassName="btn-shell"
        signInLinkClassName="sign-in-link"
        signInHref="/auth/login"
        signInLabel="Already have an account?"
        submitLabel="Create Account"
        loadingLabel="Creating"
        error=""
        onCloseError={() => undefined}
        loading={false}
        onSubmit={(event) => event.preventDefault()}
      >
        <input type="email" />
      </RegisterFormShell>,
    );

    expect(html).toContain("Create Account");
    expect(html).not.toContain("Creating");
  });

  test("HRStats and StatCard render summary values", () => {
    const statsHtml = renderToStaticMarkup(
      <HRStats activeJobs={4} totalApps={18} shortlisted={6} todayApps={3} />,
    );
    const cardHtml = renderToStaticMarkup(
      <StatCard
        label="Score"
        value="99%"
        icon="*"
        colorCls="text-emerald-700"
      />,
    );

    expect(statsHtml).toContain("Active Jobs");
    expect(statsHtml).toContain("18");
    expect(cardHtml).toContain("99%");
  });

  test("JobFilters renders default and hero variants", () => {
    const baseHtml = renderToStaticMarkup(
      <JobFilters
        search="python"
        jobType="FULL_TIME"
        expLevel="MID"
        onSearch={() => undefined}
        onJobType={() => undefined}
        onExpLevel={() => undefined}
      />,
    );
    const heroHtml = renderToStaticMarkup(
      <JobFilters
        search=""
        jobType=""
        expLevel=""
        onSearch={() => undefined}
        onJobType={() => undefined}
        onExpLevel={() => undefined}
        heroStyle
      />,
    );

    expect(baseHtml).toContain("Search by title");
    expect(baseHtml).toContain("select");
    expect(heroHtml).toContain("backdrop-blur-sm");
  });

  test("JobFilters forwards user interactions to callbacks", () => {
    const onSearch = jest.fn();
    const onJobType = jest.fn();
    const onExpLevel = jest.fn();
    const element = JobFilters({
      search: "",
      jobType: "",
      expLevel: "",
      onSearch,
      onJobType,
      onExpLevel,
    });

    const interactiveProps: Array<Record<string, unknown>> = [];
    visitTree(element, (entry) => {
      if (entry.type === "input" || entry.type === "select") {
        interactiveProps.push(entry.props as Record<string, unknown>);
      }
    });

    (interactiveProps[0].onChange as (event: { target: { value: string } }) => void)({
      target: { value: "backend" },
    });
    (interactiveProps[1].onChange as (event: { target: { value: string } }) => void)({
      target: { value: "FULL_TIME" },
    });
    (interactiveProps[2].onChange as (event: { target: { value: string } }) => void)({
      target: { value: "SENIOR" },
    });

    expect(onSearch).toHaveBeenCalledWith("backend");
    expect(onJobType).toHaveBeenCalledWith("FULL_TIME");
    expect(onExpLevel).toHaveBeenCalledWith("SENIOR");
  });

  test("JobCard renders fallback chip copy when optional fields are missing", () => {
    const html = renderToStaticMarkup(
      <JobCard
        job={{
          ...sampleJob,
          department: "Unknown",
          job_type: "REMOTE_PLUS",
          job_type_display: "",
          experience_display: "",
          salary_range: null,
          deadline: null,
        }}
      />,
    );

    expect(html).toContain("REMOTE PLUS");
    expect(html).toContain("+1 more");
    expect(html).toContain("View");
  });

  test("JobCard renders singular opening label when openings is 1", () => {
    const html = renderToStaticMarkup(
      <JobCard
        job={{
          ...sampleJob,
          openings: 1,
          total_applicants: 5,
          deadline: null,
        }}
      />,
    );

    expect(html).toContain("1 opening");
    expect(html).not.toContain("1 openings");
    expect(html).toContain("5 applied");
  });

  test("JobCard renders deadline and salary details when present", () => {
    const html = renderToStaticMarkup(<JobCard job={sampleJob} />);

    expect(html).toContain("12-18 LPA");
    expect(html).toContain("Closes");
    expect(html).toContain("11");
  });

  test("ApplicationCard renders positive and rejected states", () => {
    const positiveHtml = renderToStaticMarkup(
      <ApplicationCard
        app={sampleApp}
        withdrawing={false}
        deleting={false}
        onWithdraw={() => undefined}
        onDelete={() => undefined}
      />,
    );
    const rejectedHtml = renderToStaticMarkup(
      <ApplicationCard
        app={{
          ...sampleApp,
          status: "REJECTED",
          status_display: "Rejected",
        }}
        withdrawing={false}
        deleting
        onWithdraw={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(positiveHtml).toContain("next stage");
    expect(positiveHtml).toContain("Withdraw");
    expect(rejectedHtml).toContain("Deleting");
    expect(rejectedHtml).not.toContain("Withdraw");
  });

  test("ApplicationCard hides withdraw for HIRED and REJECTED", () => {
    for (const status of ["HIRED", "REJECTED"]) {
      const html = renderToStaticMarkup(
        <ApplicationCard
          app={{
            ...sampleApp,
            status,
            status_display: status.charAt(0) + status.slice(1).toLowerCase(),
          }}
          withdrawing={false}
          deleting={false}
          onWithdraw={() => undefined}
          onDelete={() => undefined}
        />,
      );
      expect(html).not.toContain("Withdraw");
      expect(html).toContain("Delete");
    }
  });

  test("ApplicationCard renders WITHDRAWN state without withdraw button", () => {
    const html = renderToStaticMarkup(
      <ApplicationCard
        app={{
          ...sampleApp,
          status: "WITHDRAWN",
          status_display: "Withdrawn",
          status_message: "You have withdrawn this application.",
        }}
        withdrawing={false}
        deleting={false}
        onWithdraw={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(html).toContain("Withdrawn");
    expect(html).not.toContain("Withdrawing");
  });

  test("ApplicationCard renders unknown status with default PENDING styling", () => {
    const html = renderToStaticMarkup(
      <ApplicationCard
        app={{
          ...sampleApp,
          status: "UNKNOWN_STATUS",
          status_display: "Unknown",
        }}
        withdrawing={false}
        deleting={false}
        onWithdraw={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(html).toContain("bg-slate-100");
  });

  test("ApplicationCard delete button shows disabled text when both withdrawing and deleting are true", () => {
    const html = renderToStaticMarkup(
      <ApplicationCard
        app={{
          ...sampleApp,
          status: "PENDING",
          status_display: "Pending",
        }}
        withdrawing={true}
        deleting={true}
        onWithdraw={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(html).toContain("Deleting");
    expect(html).toContain("disabled");
  });

  test("ApplicationCard wires withdraw and delete actions", () => {
    const onWithdraw = jest.fn();
    const onDelete = jest.fn();
    const element = ApplicationCard({
      app: sampleApp,
      withdrawing: false,
      deleting: false,
      onWithdraw,
      onDelete,
    });

    const buttons: Array<Record<string, unknown>> = [];
    visitTree(element, (entry) => {
      if (entry.type === "button") {
        buttons.push(entry.props as Record<string, unknown>);
      }
    });

    (buttons[0].onClick as () => void)();
    (buttons[1].onClick as () => void)();

    expect(onWithdraw).toHaveBeenCalledWith(sampleApp.id);
    expect(onDelete).toHaveBeenCalledWith(sampleApp.id);
  });

  test("Navbar renders applicant and guest variants", () => {
    const userHtml = renderToStaticMarkup(<Navbar />);

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      logout: jest.fn(),
    });
    const guestHtml = renderToStaticMarkup(<Navbar variant="hr" />);

    expect(userHtml).toContain("Ada Lovelace");
    expect(userHtml).toContain("Browse Jobs");
    expect(guestHtml).toContain("Get started");
    expect(guestHtml).toContain("HR Portal");
  });

  test("Navbar shows Human Resources as default department when hr_department is empty", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        full_name: "Jane Doe",
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@example.com",
        hr_department: "",
      },
      logout: jest.fn(),
    });
    const html = renderToStaticMarkup(<Navbar variant="hr" />);

    expect(html).toContain("Human Resources");
  });
});
