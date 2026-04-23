import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ErrorAlert from "@/components/shared/ErrorAlert";
import LoadingSpinner, {
  InlineLoader,
  PageLoader,
} from "@/components/shared/LoadingSpinner";
import FormField from "@/components/ui/FormField";
import StatusBadge from "@/components/ui/StatusBadge";

describe("ErrorAlert", () => {
  test("returns empty markup when message is missing", () => {
    expect(renderToStaticMarkup(<ErrorAlert message="" />)).toBe("");
  });

  test("renders message, className, and close button", () => {
    const html = renderToStaticMarkup(
      <ErrorAlert
        message={"Line one\nLine two"}
        className="extra-spacing"
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("Line one");
    expect(html).toContain("Line two");
    expect(html).toContain("extra-spacing");
    expect(html).toContain("button");
  });
});

describe("LoadingSpinner", () => {
  test("renders default size and color classes", () => {
    const html = renderToStaticMarkup(<LoadingSpinner />);

    expect(html).toContain("w-7 h-7");
    expect(html).toContain("border-indigo-600");
  });

  test("renders custom size and color classes", () => {
    const html = renderToStaticMarkup(
      <LoadingSpinner size="sm" color="white" />,
    );

    expect(html).toContain("w-4 h-4");
    expect(html).toContain("border-white");
  });

  test("renders page and inline loader variants", () => {
    const pageHtml = renderToStaticMarkup(<PageLoader color="violet" />);
    const inlineHtml = renderToStaticMarkup(<InlineLoader />);

    expect(pageHtml).toContain("Loading");
    expect(pageHtml).toContain("border-violet-600");
    expect(inlineHtml).toContain("justify-center");
  });

  test("uses the default page loader color when none is provided", () => {
    const html = renderToStaticMarkup(<PageLoader />);

    expect(html).toContain("border-indigo-600");
  });
});

describe("FormField", () => {
  test("renders hint when there is no error", () => {
    const html = renderToStaticMarkup(
      <FormField
        label="Email"
        required
        hint="We will never share it."
        className="field-shell"
      >
        <input type="email" />
      </FormField>,
    );

    expect(html).toContain("Email");
    expect(html).toContain("label-required");
    expect(html).toContain("We will never share it.");
    expect(html).toContain("field-shell");
  });

  test("renders error instead of hint", () => {
    const html = renderToStaticMarkup(
      <FormField label="Password" hint="At least 8 characters" error="Required">
        <input type="password" />
      </FormField>,
    );

    expect(html).toContain("Required");
    expect(html).not.toContain("At least 8 characters");
  });
});

describe("StatusBadge", () => {
  test("renders known status with icon by default", () => {
    const html = renderToStaticMarkup(<StatusBadge status="SHORTLISTED" />);

    expect(html).toContain("Shortlisted");
    expect(html).toContain("bg-emerald-50");
  });

  test("renders fallback status without icon when requested", () => {
    const html = renderToStaticMarkup(
      <StatusBadge status="CUSTOM_STATUS" showIcon={false} />,
    );

    expect(html).toContain("CUSTOM_STATUS");
    expect(html).toContain("bg-slate-100");
  });
});
