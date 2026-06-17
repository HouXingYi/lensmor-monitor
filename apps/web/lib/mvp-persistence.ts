import {
  hydrateCompetitors,
  hydrateReports,
  hydrateTasks,
  listCompetitors,
  listReports,
  listTasksForCompetitor,
  type CompetitorRecord,
  type ReportRecord,
  type TaskRecord,
} from "./mvp-store";

const competitorsCookieName = "lensmor_competitors";
const reportsCookieName = "lensmor_reports";
const tasksCookieName = "lensmor_tasks";
const cookieMaxAgeSeconds = 60 * 60 * 24 * 7;
const maxCookieValueLength = 3600;
const maxPersistedReports = 5;
const maxPersistedTasks = 5;

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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isReportRecord(value: unknown): value is ReportRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ReportRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.ownerId === "string" &&
    typeof record.competitorId === "string" &&
    typeof record.title === "string" &&
    (record.priority === "urgent" || record.priority === "medium" || record.priority === "low") &&
    typeof record.changedAt === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.sourceUrl === "string" &&
    isStringArray(record.changeSummary) &&
    typeof record.strategicIntent === "string" &&
    isStringArray(record.recommendedActions)
  );
}

function isTaskRecord(value: unknown): value is TaskRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<TaskRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.ownerId === "string" &&
    typeof record.competitorId === "string" &&
    (record.triggerType === "manual" || record.triggerType === "scheduled") &&
    (record.status === "queued" ||
      record.status === "collecting" ||
      record.status === "diffing" ||
      record.status === "analyzing" ||
      record.status === "completed" ||
      record.status === "failed") &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

function encodeCookieJson(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeCookieJson(value: string): unknown {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

function parseCookieJson(value: string): unknown {
  try {
    return decodeCookieJson(value);
  } catch {
    return JSON.parse(decodeURIComponent(value)) as unknown;
  }
}

function createCookie(name: string, value: unknown): string {
  return [
    `${name}=${encodeCookieJson(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${cookieMaxAgeSeconds}`,
  ].join("; ");
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

function compactReportForCookie(report: ReportRecord): ReportRecord {
  return {
    ...report,
    title: truncateText(report.title, 120),
    changeSummary: report.changeSummary.slice(0, 3).map((item) => truncateText(item, 90)),
    strategicIntent: truncateText(report.strategicIntent, 220),
    recommendedActions: report.recommendedActions.slice(0, 3).map((item) => truncateText(item, 90)),
  };
}

function fitCookieItems<T>(items: T[]): T[] {
  for (let length = items.length; length > 0; length -= 1) {
    const candidate = items.slice(0, length);
    if (encodeCookieJson(candidate).length <= maxCookieValueLength) {
      return candidate;
    }
  }
  return [];
}

export function readPersistedCompetitors(cookieHeader: string | null, ownerId: string): CompetitorRecord[] {
  const raw = parseCookies(cookieHeader).get(competitorsCookieName);
  if (!raw) return [];

  try {
    const parsed = parseCookieJson(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCompetitorRecord).filter((competitor) => competitor.ownerId === ownerId);
  } catch {
    return [];
  }
}

export function readPersistedReports(cookieHeader: string | null, ownerId: string): ReportRecord[] {
  const raw = parseCookies(cookieHeader).get(reportsCookieName);
  if (!raw) return [];

  try {
    const parsed = parseCookieJson(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isReportRecord).filter((report) => report.ownerId === ownerId);
  } catch {
    return [];
  }
}

export function readPersistedTasks(cookieHeader: string | null, ownerId: string): TaskRecord[] {
  const raw = parseCookies(cookieHeader).get(tasksCookieName);
  if (!raw) return [];

  try {
    const parsed = parseCookieJson(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTaskRecord).filter((task) => task.ownerId === ownerId);
  } catch {
    return [];
  }
}

export function hydrateCompetitorsFromCookie(ownerId: string, cookieHeader: string | null): void {
  hydrateCompetitors(ownerId, readPersistedCompetitors(cookieHeader, ownerId));
}

export function hydrateReportsFromCookie(ownerId: string, cookieHeader: string | null): void {
  hydrateReports(ownerId, readPersistedReports(cookieHeader, ownerId));
}

export function hydrateTasksFromCookie(ownerId: string, cookieHeader: string | null): void {
  hydrateTasks(ownerId, readPersistedTasks(cookieHeader, ownerId));
}

export function hydrateMvpStateFromCookie(ownerId: string, cookieHeader: string | null): void {
  hydrateCompetitorsFromCookie(ownerId, cookieHeader);
  hydrateReportsFromCookie(ownerId, cookieHeader);
  hydrateTasksFromCookie(ownerId, cookieHeader);
}

export function createCompetitorsCookie(ownerId: string): string {
  return createCookie(competitorsCookieName, listCompetitors(ownerId));
}

export function createReportsCookie(ownerId: string): string {
  const reports = listReports(ownerId)
    .slice(0, maxPersistedReports)
    .map(compactReportForCookie);
  return createCookie(reportsCookieName, fitCookieItems(reports));
}

export function createTasksCookie(ownerId: string): string {
  const tasks = listCompetitors(ownerId)
    .flatMap((competitor) => listTasksForCompetitor(ownerId, competitor.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, maxPersistedTasks);
  return createCookie(tasksCookieName, tasks);
}
