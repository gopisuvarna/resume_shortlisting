jest.mock("next/server", () => ({
  NextResponse: {
    redirect: jest.fn((url: URL) => ({
      kind: "redirect",
      destination: url.toString(),
    })),
    next: jest.fn(() => ({ kind: "next" })),
  },
}));

import { middleware, config } from "@/middleware";

describe("middleware", () => {
  const makeRequest = (
    pathname: string,
    cookies: Record<string, string> = {},
  ) =>
    ({
      url: `http://localhost:3000${pathname}`,
      nextUrl: { pathname },
      cookies: {
        get: (name: string) =>
          cookies[name] ? { value: cookies[name] } : undefined,
      },
    }) as never;

  test("redirects unauthenticated protected user routes to login", () => {
    const response = middleware(makeRequest("/my-applications"));

    expect(response).toEqual({
      kind: "redirect",
      destination: "http://localhost:3000/auth/login",
    });
  });

  test("redirects applicants away from hr routes", () => {
    const response = middleware(
      makeRequest("/hr/jobs", {
        access_token: "token",
        user_role: "APPLICANT",
      }),
    );

    expect(response).toEqual({
      kind: "redirect",
      destination: "http://localhost:3000/jobs",
    });
  });

  test("redirects hr users away from applicant-only routes", () => {
    const response = middleware(
      makeRequest("/jobs/7", {
        access_token: "token",
        user_role: "HR",
      }),
    );

    expect(response).toEqual({
      kind: "redirect",
      destination: "http://localhost:3000/hr/dashboard",
    });
  });

  test("redirects authenticated users away from auth pages", () => {
    const hrResponse = middleware(
      makeRequest("/auth/login", {
        access_token: "token",
        user_role: "HR",
      }),
    );
    const applicantResponse = middleware(
      makeRequest("/auth/register", {
        access_token: "token",
        user_role: "APPLICANT",
      }),
    );

    expect(hrResponse).toEqual({
      kind: "redirect",
      destination: "http://localhost:3000/hr/dashboard",
    });
    expect(applicantResponse).toEqual({
      kind: "redirect",
      destination: "http://localhost:3000/jobs",
    });
  });

  test("allows public routes to continue", () => {
    const response = middleware(makeRequest("/jobs"));

    expect(response).toEqual({ kind: "next" });
  });

  test("exports the expected matcher config", () => {
    expect(config.matcher).toEqual([
      "/hr/:path*",
      "/my-applications",
      "/my-applications/:path*",
      "/auth/:path*",
    ]);
  });
});
