import { type SessionPrincipal } from "@lensmor/domain";

const sessionCookieName = "lensmor_session";
const onboardingCookieName = "lensmor_onboarded";
const singleUserId = "single-user";

function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? "dev-session-secret";
}

function encodeBase64Url(value: string): string {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string): string {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  const bytes = Array.from(new Uint8Array(signature));
  return encodeBase64Url(String.fromCharCode(...bytes));
}

function parseCookies(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>();

  for (const part of cookieHeader?.split(";") ?? []) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName || rawValue.length === 0) continue;
    cookies.set(rawName, rawValue.join("="));
  }

  return cookies;
}

export function validateCredentials(email: string, password: string): boolean {
  const configuredEmail = process.env.SINGLE_USER_EMAIL ?? "demo@lensmor.local";
  const configuredPassword = process.env.SINGLE_USER_PASSWORD ?? "change-me";

  return email === configuredEmail && password === configuredPassword;
}

export async function createSessionCookie(principal: SessionPrincipal): Promise<string> {
  const payload = encodeBase64Url(JSON.stringify(principal));
  const signature = await sign(payload);
  const token = `${payload}.${signature}`;

  return [
    `${sessionCookieName}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=604800",
  ].join("; ");
}

export function clearSessionCookie(): string {
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function createOnboardingCookie(): string {
  return `${onboardingCookieName}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}

export function clearOnboardingCookie(): string {
  return `${onboardingCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function readSessionFromCookieHeader(
  cookieHeader: string | null,
): Promise<SessionPrincipal | null> {
  const token = parseCookies(cookieHeader).get(sessionCookieName);
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = await sign(payload);
  if (signature !== expected) return null;

  try {
    return JSON.parse(decodeBase64Url(payload)) as SessionPrincipal;
  } catch {
    return null;
  }
}

export function createSingleUserPrincipal(email: string): SessionPrincipal {
  return {
    userId: singleUserId,
    email,
  };
}

export function hasCompletedOnboarding(cookieHeader: string | null): boolean {
  return parseCookies(cookieHeader).get(onboardingCookieName) === "1";
}

export function isProtectedPath(pathname: string): boolean {
  if (pathname === "/login") return false;
  if (pathname.startsWith("/api/auth/")) return false;
  if (pathname.startsWith("/_next/")) return false;
  if (pathname === "/favicon.ico") return false;
  return true;
}
