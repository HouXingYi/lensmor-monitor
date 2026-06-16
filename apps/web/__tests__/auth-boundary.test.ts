import { describe, expect, it, vi } from "vitest";

import { POST as login } from "../app/api/auth/login/route";
import { POST as logout } from "../app/api/auth/logout/route";
import {
  clearOnboardingCookie,
  createSessionCookie,
  isProtectedPath,
  readSessionFromCookieHeader,
  validateCredentials,
} from "../lib/session";

describe("auth boundary", () => {
  it("validates the configured single user credentials", () => {
    vi.stubEnv("SINGLE_USER_EMAIL", "demo@lensmor.local");
    vi.stubEnv("SINGLE_USER_PASSWORD", "change-me");

    expect(validateCredentials("demo@lensmor.local", "change-me")).toBe(true);
    expect(validateCredentials("demo@lensmor.local", "wrong")).toBe(false);
  });

  it("creates and reads a signed session cookie", async () => {
    vi.stubEnv("SESSION_SECRET", "test-secret");

    const cookie = await createSessionCookie({ userId: "single-user", email: "demo@lensmor.local" });
    const session = await readSessionFromCookieHeader(cookie);

    expect(cookie).toContain("lensmor_session=");
    expect(session?.email).toBe("demo@lensmor.local");
  });

  it("logs in with valid credentials and rejects invalid credentials", async () => {
    vi.stubEnv("SESSION_SECRET", "test-secret");
    vi.stubEnv("SINGLE_USER_EMAIL", "demo@lensmor.local");
    vi.stubEnv("SINGLE_USER_PASSWORD", "change-me");

    const success = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "demo@lensmor.local", password: "change-me" }),
      }),
    );
    const failure = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "demo@lensmor.local", password: "bad" }),
      }),
    );

    expect(success.status).toBe(200);
    expect(success.headers.get("set-cookie")).toContain("lensmor_session=");
    expect(failure.status).toBe(401);
  });

  it("clears both session and onboarding cookies on logout", async () => {
    const response = await logout();
    const setCookie = response.headers.getSetCookie();

    expect(setCookie).toContain("lensmor_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    expect(setCookie).toContain(clearOnboardingCookie());
  });

  it("treats product routes and APIs as protected paths", () => {
    expect(isProtectedPath("/")).toBe(true);
    expect(isProtectedPath("/competitors")).toBe(true);
    expect(isProtectedPath("/api/reports")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/api/auth/login")).toBe(false);
  });
});
