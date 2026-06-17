import { hydrateCompetitors, listCompetitors, type CompetitorRecord } from "./mvp-store";

const competitorsCookieName = "lensmor_competitors";
const cookieMaxAgeSeconds = 60 * 60 * 24 * 7;

function parseCookies(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>();

  for (const part of cookieHeader?.split(";") ?? []) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName || rawValue.length === 0) continue;
    cookies.set(rawName, rawValue.join("="));
  }

  return cookies;
}

function isCompetitorRecord(value: unknown): value is CompetitorRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CompetitorRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.ownerId === "string" &&
    typeof record.name === "string" &&
    typeof record.mainDomain === "string" &&
    (record.status === "monitoring" || record.status === "paused" || record.status === "collecting") &&
    Array.isArray(record.links) &&
    record.links.every((link) => {
      const candidate = link as Partial<CompetitorRecord["links"][number]>;
      return typeof candidate.label === "string" && typeof candidate.url === "string";
    })
  );
}

export function readPersistedCompetitors(cookieHeader: string | null, ownerId: string): CompetitorRecord[] {
  const raw = parseCookies(cookieHeader).get(competitorsCookieName);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCompetitorRecord).filter((competitor) => competitor.ownerId === ownerId);
  } catch {
    return [];
  }
}

export function hydrateCompetitorsFromCookie(ownerId: string, cookieHeader: string | null): void {
  hydrateCompetitors(ownerId, readPersistedCompetitors(cookieHeader, ownerId));
}

export function createCompetitorsCookie(ownerId: string): string {
  const value = encodeURIComponent(JSON.stringify(listCompetitors(ownerId)));
  return [
    `${competitorsCookieName}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${cookieMaxAgeSeconds}`,
  ].join("; ");
}
