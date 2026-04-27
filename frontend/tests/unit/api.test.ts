/* eslint-disable @typescript-eslint/no-require-imports */
describe("api helpers", () => {
  const setupModule = () => {
    jest.resetModules();

    const requestUse = jest.fn();
    const responseUse = jest.fn();
    const get = jest.fn();
    const post = jest.fn();
    const patch = jest.fn();
    const del = jest.fn();

    const instance = {
      interceptors: {
        request: { use: requestUse },
        response: { use: responseUse },
      },
      get,
      post,
      patch,
      delete: del,
    };

    const axiosMock = {
      create: jest.fn(() => instance),
      post: jest.fn(),
      isAxiosError: jest.fn(),
    };

    jest.doMock("axios", () => ({
      __esModule: true,
      default: axiosMock,
      ...axiosMock,
    }));

    const apiModule = require("@/lib/api");
    return {
      apiModule,
      axiosMock,
      instance,
      requestUse,
      responseUse,
      get,
      post,
      patch,
      del,
    };
  };

  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
  });

  test("sets, reads, and clears cookies", () => {
    const { apiModule } = setupModule();
    (globalThis as Record<string, unknown>).document = { cookie: "" };

    apiModule.setCookie("access_token", "abc 123", 1);
    expect(
      (globalThis as { document: { cookie: string } }).document.cookie,
    ).toContain("access_token=abc%20123");

    (globalThis as { document: { cookie: string } }).document.cookie =
      "access_token=token-value; refresh_token=refresh-value; user_role=HR";
    expect(apiModule.getCookie("refresh_token")).toBe("refresh-value");
    expect(apiModule.getCookie("missing")).toBeNull();

    apiModule.clearAuthCookies();
    expect(
      (globalThis as { document: { cookie: string } }).document.cookie,
    ).toContain("user_role=");
  });

  test("cookie helpers are no-ops when document is unavailable", () => {
    const { apiModule } = setupModule();

    expect(apiModule.getCookie("access_token")).toBeNull();
    expect(() => apiModule.setCookie("access_token", "value")).not.toThrow();
    expect(() => apiModule.clearAuthCookies()).not.toThrow();
  });

  test("request interceptor adds authorization header from access token", () => {
    const { requestUse } = setupModule();
    (globalThis as Record<string, unknown>).window = {};
    (globalThis as Record<string, unknown>).document = {
      cookie: "access_token=encoded%20token",
    };

    const interceptor = requestUse.mock.calls[0][0];
    const config = interceptor({ headers: {} });

    expect(config.headers.Authorization).toBe("Bearer encoded token");
  });

  test("request interceptor leaves config unchanged without window or headers", () => {
    const { requestUse } = setupModule();
    const interceptor = requestUse.mock.calls[0][0];

    expect(interceptor({})).toEqual({});

    (globalThis as Record<string, unknown>).window = {};
    (globalThis as Record<string, unknown>).document = { cookie: "" };
    expect(interceptor({})).toEqual({});
  });

  test("extractApiErrorMessage handles strings, objects, arrays, and fallback values", () => {
    const { apiModule, axiosMock } = setupModule();

    axiosMock.isAxiosError.mockReturnValue(false);
    expect(apiModule.extractApiErrorMessage(new Error("x"), "fallback")).toBe(
      "fallback",
    );

    axiosMock.isAxiosError.mockReturnValue(true);
    expect(
      apiModule.extractApiErrorMessage(
        { response: { data: "Plain error" } },
        "fallback",
      ),
    ).toBe("Plain error");

    expect(
      apiModule.extractApiErrorMessage(
        {
          response: {
            data: { email: ["Required"], non_field_errors: ["Bad login"] },
          },
        },
        "fallback",
        true,
      ),
    ).toBe("email: Required\nBad login");

    expect(
      apiModule.extractApiErrorMessage({ response: { data: {} } }, "fallback"),
    ).toBe("fallback");

    expect(
      apiModule.extractApiErrorMessage({ response: { data: 123 } }, "fallback"),
    ).toBe("fallback");

    expect(
      apiModule.extractApiErrorMessage(
        { response: { data: { tags: [["One"], ["Two"]] } } },
        "fallback",
        true,
      ),
    ).toBe("tags: One, Two");

    const successHandler = responseUse.mock.calls[0][0];
    expect(successHandler({ data: { ok: true } })).toEqual({
      data: { ok: true },
    });
  });

  test("response interceptor refreshes token and retries once on 401", async () => {
    const { axiosMock, instance } = setupModule();
    (globalThis as Record<string, unknown>).window = { location: { href: "" } };
    (globalThis as Record<string, unknown>).document = {
      cookie: "refresh_token=refresh-123",
    };

    axiosMock.post.mockResolvedValue({ data: { access: "new-access" } });
    const retryResponse = { data: { ok: true } };
    const apiSpy = jest.spyOn(instance as never, "post");
    const callableInstance = Object.assign(
      jest.fn().mockResolvedValue(retryResponse),
      instance,
    );
    jest.resetModules();

    const requestUse = jest.fn();
    const freshResponseUse = jest.fn();
    const axiosAgain = {
      create: jest.fn(() =>
        Object.assign(callableInstance, {
          interceptors: {
            request: { use: requestUse },
            response: { use: freshResponseUse },
          },
        }),
      ),
      post: axiosMock.post,
      isAxiosError: jest.fn().mockReturnValue(true),
    };
    jest.doMock("axios", () => ({
      __esModule: true,
      default: axiosAgain,
      ...axiosAgain,
    }));
    const freshModule = require("@/lib/api");
    const rejectionHandler = freshResponseUse.mock.calls[0][1];

    const result = await rejectionHandler({
      config: { headers: {} },
      response: { status: 401 },
    });

    expect(result).toEqual(retryResponse);
    expect(axiosAgain.post).toHaveBeenCalledWith(
      "http://localhost:8000/api/token/refresh/",
      { refresh: "refresh-123" },
    );
    expect(freshModule.getCookie("missing")).toBeNull();
    expect(apiSpy).not.toHaveBeenCalled();
  });

  test("response interceptor clears cookies and redirects when refresh fails", async () => {
    jest.resetModules();
    const requestUse = jest.fn();
    const responseUse = jest.fn();
    const callableInstance = Object.assign(jest.fn(), {
      interceptors: {
        request: { use: requestUse },
        response: { use: responseUse },
      },
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
    const axiosMock = {
      create: jest.fn(() => callableInstance),
      post: jest.fn().mockRejectedValue(new Error("refresh failed")),
      isAxiosError: jest.fn().mockReturnValue(true),
    };
    jest.doMock("axios", () => ({
      __esModule: true,
      default: axiosMock,
      ...axiosMock,
    }));

    const apiModule = require("@/lib/api");
    (globalThis as Record<string, unknown>).window = { location: { href: "" } };
    (globalThis as Record<string, unknown>).document = {
      cookie: "refresh_token=refresh-123",
    };

    const rejectionHandler = responseUse.mock.calls[0][1];
    await expect(
      rejectionHandler({
        config: { headers: {} },
        response: { status: 401 },
      }),
    ).rejects.toEqual({
      config: { _retry: true, headers: {} },
      response: { status: 401 },
    });

    expect(
      (globalThis as { window: { location: { href: string } } }).window.location
        .href,
    ).toBe("/auth/login");
    apiModule.clearAuthCookies();
  });

  test("API wrappers call the expected endpoints", () => {
    const { apiModule, get, post, patch, del } = setupModule();

    apiModule.authAPI.login({ email: "user@example.com" });
    apiModule.authAPI.registerApplicant({ email: "applicant@example.com" });
    apiModule.authAPI.registerHR({ email: "hr@example.com" });
    apiModule.authAPI.logout({ refresh: "refresh-token" });
    apiModule.authAPI.profile();
    apiModule.authAPI.updateProfile({ first_name: "Ada" });
    apiModule.authAPI.changePassword({
      old_password: "old",
      new_password: "new-password",
    });
    apiModule.jobsAPI.list({ status: "ACTIVE" });
    apiModule.jobsAPI.get(7);
    apiModule.jobsAPI.create({ title: "Engineer" });
    apiModule.jobsAPI.update(7, { title: "Senior Engineer" });
    apiModule.jobsAPI.delete(7);
    apiModule.jobsAPI.stats(7);
    apiModule.jobsAPI.myJobs();
    apiModule.applicationsAPI.list();
    apiModule.applicationsAPI.create({ job: 1 });
    apiModule.applicationsAPI.get(2);
    apiModule.applicationsAPI.byJob(3, "2026-04-26");
    apiModule.applicationsAPI.dailySummary(3);
    apiModule.applicationsAPI.updateStatus(2, { status: "SHORTLISTED" });
    apiModule.applicationsAPI.withdraw(2);
    apiModule.applicationsAPI.delete(2);
    apiModule.shortlistAPI.get(3, 70, "YES");
    apiModule.shortlistAPI.bulkShortlist(3, 75);

    expect(post).toHaveBeenCalledWith("/auth/register/applicant/", {
      email: "applicant@example.com",
    });
    expect(post).toHaveBeenCalledWith("/auth/register/hr/", {
      email: "hr@example.com",
    });
    expect(post).toHaveBeenCalledWith("/auth/login/", {
      email: "user@example.com",
    });
    expect(post).toHaveBeenCalledWith("/auth/logout/", {
      refresh: "refresh-token",
    });
    expect(get).toHaveBeenCalledWith("/auth/profile/");
    expect(patch).toHaveBeenCalledWith("/auth/profile/", { first_name: "Ada" });
    expect(post).toHaveBeenCalledWith("/auth/change-password/", {
      old_password: "old",
      new_password: "new-password",
    });
    expect(get).toHaveBeenCalledWith("/jobs/", {
      params: { status: "ACTIVE" },
    });
    expect(get).toHaveBeenCalledWith("/jobs/7/");
    expect(post).toHaveBeenCalledWith("/jobs/", { title: "Engineer" });
    expect(patch).toHaveBeenCalledWith("/jobs/7/", {
      title: "Senior Engineer",
    });
    expect(del).toHaveBeenCalledWith("/jobs/7/");
    expect(get).toHaveBeenCalledWith("/jobs/7/stats/");
    expect(get).toHaveBeenCalledWith("/jobs/my_jobs/");
    expect(get).toHaveBeenCalledWith("/applications/", { params: undefined });
    expect(post).toHaveBeenCalledWith("/applications/", { job: 1 });
    expect(get).toHaveBeenCalledWith("/applications/2/");
    expect(get).toHaveBeenCalledWith("/applications/by_job/", {
      params: { job_id: 3, date: "2026-04-26" },
    });
    expect(get).toHaveBeenCalledWith("/applications/daily_summary/", {
      params: { job_id: 3 },
    });
    expect(patch).toHaveBeenCalledWith("/applications/2/update_status/", {
      status: "SHORTLISTED",
    });
    expect(post).toHaveBeenCalledWith("/applications/2/withdraw/");
    expect(del).toHaveBeenCalledWith("/applications/2/");
    expect(get).toHaveBeenCalledWith("/shortlist/", {
      params: { job_id: 3, min_score: 70, recommendation: "YES" },
    });
    expect(post).toHaveBeenCalledWith("/shortlist/", {
      job_id: 3,
      threshold: 75,
    });
  });
});
