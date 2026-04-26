import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-auth-provider="true">{children}</div>
  ),
}));

import RootLayout, { metadata } from "@/app/layout";
import RootPage from "@/app/page";
import { redirect } from "next/navigation";

describe("layout and root page", () => {
  test("root page redirects to jobs", () => {
    RootPage();

    expect(redirect).toHaveBeenCalledWith("/jobs");
  });

  test("layout renders children inside the auth provider and exposes metadata", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <main>Dashboard</main>
      </RootLayout>,
    );

    expect(html).toContain("data-auth-provider=\"true\"");
    expect(html).toContain("Dashboard");
    expect(html).toContain("fonts.googleapis.com");
    expect(metadata.title).toBe("Nueve IT Solutions Careers");
  });
});
