import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("Navbar mobile menu", () => {
  const loadNavbar = (user: Record<string, unknown> | null, variant: "applicant" | "hr" = "applicant") => {
    let Navbar: React.ComponentType<{ variant?: "applicant" | "hr" }>;
    const setOpen = jest.fn();
    const logout = jest.fn();

    jest.isolateModules(() => {
      jest.doMock("next/link", () => ({
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

      jest.doMock("next/image", () => ({
        __esModule: true,
        default: ({ priority, ...props }: Record<string, unknown>) => (
          <img {...props} alt={String(props.alt ?? "")} />
        ),
      }));

      jest.doMock("next/navigation", () => ({
        usePathname: () => (variant === "hr" ? "/hr/jobs" : "/my-applications"),
      }));

      jest.doMock("@/hooks/useAuth", () => ({
        useAuth: () => ({
          user,
          logout,
        }),
      }));

      jest.doMock("react", () => {
        const actual = jest.requireActual("react");
        return {
          ...actual,
          useState: jest.fn(() => [true, setOpen]),
        };
      });

      Navbar = require("@/components/shared/Navbar").default;
    });

    const element = <Navbar variant={variant} />;
    return { html: renderToStaticMarkup(element), Navbar, setOpen, logout };
  };

  function visitTree(node: React.ReactNode, visitor: (element: React.ReactElement) => void) {
    if (!React.isValidElement(node)) return;
    visitor(node);
    React.Children.forEach(node.props.children, (child) => visitTree(child, visitor));
  }

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("renders the open mobile menu for authenticated hr users", () => {
    const { html, Navbar, setOpen, logout } = loadNavbar(
      {
        full_name: "Grace Hopper",
        first_name: "Grace",
        last_name: "Hopper",
        email: "grace@example.com",
        hr_department: "Talent",
      },
      "hr",
    );
    const tree = Navbar({ variant: "hr" });
    const clickables: Array<Record<string, unknown>> = [];
    visitTree(tree, (entry) => {
      if (entry.props.onClick) {
        clickables.push(entry.props as Record<string, unknown>);
      }
    });
    const hamburger = clickables.find((props) =>
      String(props.className ?? "").includes("md:hidden"),
    );
    const mobileLink = clickables.find((props) =>
      String(props.className ?? "").includes("flex items-center gap-3"),
    );
    const signOut = clickables.find((props) =>
      String(props.className ?? "").includes("w-full text-left"),
    );
    (hamburger?.onClick as () => void)();
    (mobileLink?.onClick as () => void)();
    (signOut?.onClick as () => void)();

    expect(html).toContain("Sign out");
    expect(html).toContain("Grace Hopper");
    expect(html).toContain("HR Portal");
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(setOpen).toHaveBeenCalledWith(expect.any(Function));
    expect(logout).toHaveBeenCalled();
  });

  test("renders Human Resources as default dept when hr_department is empty", () => {
    const { html, Navbar } = loadNavbar(
      {
        full_name: "Grace Hopper",
        first_name: "Grace",
        last_name: "Hopper",
        email: "grace@example.com",
        hr_department: "",
      },
      "hr",
    );

    expect(html).toContain("Human Resources");
  });

  test("renders the open mobile guest menu", () => {
    const { html, Navbar, setOpen } = loadNavbar(null);
    const tree = Navbar({ variant: "applicant" });
    const clickables: Array<Record<string, unknown>> = [];
    visitTree(tree, (entry) => {
      if (entry.props.onClick) {
        clickables.push(entry.props as Record<string, unknown>);
      }
    });
    clickables
      .filter((props) => String(props.className ?? "").includes("block px-4 py-3"))
      .forEach((props) => (props.onClick as () => void)());

    expect(html).toContain("Get started");
    expect(html).toContain("Sign in");
    expect(setOpen).toHaveBeenCalledWith(false);
  });
});
