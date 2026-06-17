import { type AnalysisReportDraft, type CollectionTask, type ReportPriority } from "@lensmor/domain";

import { type CollectedMockSnapshot } from "./mock-pages";

export type CompetitorStatus = "monitoring" | "paused" | "collecting";
export type FeedbackType = "useful" | "wrong" | "not_important";
export type WrongReason =
  | "information_inaccurate"
  | "content_irrelevant"
  | "data_outdated"
  | "duplicate_information"
  | "strategic_intent_wrong"
  | "missing_key_change"
  | "too_noisy"
  | "source_data_inaccurate";

export interface ProductProfile {
  ownerId: string;
  role: string;
  product: {
    name: string;
    url: string;
    oneLineDescription: string;
    targetAudience: string;
    coreSellingPoints: string;
    competitiveEdge: string;
    strategicGoal: string;
  };
}

export interface CompetitorLink {
  label: string;
  url: string;
}

export interface CompetitorRecord {
  id: string;
  ownerId: string;
  name: string;
  mainDomain: string;
  logoUrl?: string;
  status: CompetitorStatus;
  links: CompetitorLink[];
}

export interface ReportRecord extends AnalysisReportDraft {
  id: string;
  ownerId: string;
  createdAt: string;
}

export interface TaskRecord extends CollectionTask {
  ownerId: string;
  reportId?: string;
}

export interface ReportFeedbackRecord {
  id: string;
  ownerId: string;
  reportId: string;
  type: FeedbackType;
  wrongReason?: WrongReason;
  createdAt: string;
}

interface MvpStoreState {
  productProfiles: Map<string, ProductProfile>;
  competitors: Map<string, CompetitorRecord>;
  reports: Map<string, ReportRecord>;
  tasks: Map<string, TaskRecord>;
  mockSnapshots: Map<string, CollectedMockSnapshot>;
  readReports: Set<string>;
  feedback: Map<string, ReportFeedbackRecord>;
}

declare global {
  // Keep the MVP in-memory store shared across Next.js route and page module instances in dev.
  // This is still intentionally ephemeral and resets when the server restarts.
  var __lensmorMvpStore: MvpStoreState | undefined;
}

const store =
  globalThis.__lensmorMvpStore ??
  (globalThis.__lensmorMvpStore = {
    productProfiles: new Map<string, ProductProfile>(),
    competitors: new Map<string, CompetitorRecord>(),
    reports: new Map<string, ReportRecord>(),
    tasks: new Map<string, TaskRecord>(),
    mockSnapshots: new Map<string, CollectedMockSnapshot>(),
    readReports: new Set<string>(),
    feedback: new Map<string, ReportFeedbackRecord>(),
  });

const { productProfiles, competitors, reports, tasks, mockSnapshots, readReports, feedback } = store;

export function resetMvpStore(): void {
  productProfiles.clear();
  competitors.clear();
  reports.clear();
  tasks.clear();
  mockSnapshots.clear();
  readReports.clear();
  feedback.clear();
}

export function saveProductProfile(profile: ProductProfile): ProductProfile {
  productProfiles.set(profile.ownerId, profile);
  return profile;
}

export function getProductProfile(ownerId: string): ProductProfile | undefined {
  return productProfiles.get(ownerId);
}

export function createCompetitor(
  ownerId: string,
  input: Omit<CompetitorRecord, "id" | "ownerId" | "status"> & { status?: CompetitorStatus },
): CompetitorRecord {
  if (input.links.length > 10) {
    throw new Error("每个竞品最多只能添加 10 条关联链接。");
  }

  const competitor: CompetitorRecord = {
    id: crypto.randomUUID(),
    ownerId,
    name: input.name,
    mainDomain: input.mainDomain,
    ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
    status: input.status ?? "monitoring",
    links: input.links,
  };
  competitors.set(competitor.id, competitor);
  return competitor;
}

export function listCompetitors(ownerId: string): CompetitorRecord[] {
  return Array.from(competitors.values()).filter((competitor) => competitor.ownerId === ownerId);
}

export function hydrateCompetitors(ownerId: string, records: CompetitorRecord[]): void {
  for (const record of records) {
    if (record.ownerId === ownerId) {
      competitors.set(record.id, record);
    }
  }
}

export function getCompetitor(ownerId: string, id: string): CompetitorRecord | undefined {
  const competitor = competitors.get(id);
  if (!competitor || competitor.ownerId !== ownerId) return undefined;
  return competitor;
}

export function updateCompetitor(
  ownerId: string,
  id: string,
  patch: Partial<Omit<CompetitorRecord, "id" | "ownerId">>,
): CompetitorRecord | undefined {
  const competitor = getCompetitor(ownerId, id);
  if (!competitor) return undefined;

  const nextLinks = patch.links ?? competitor.links;
  if (nextLinks.length > 10) {
    throw new Error("每个竞品最多只能添加 10 条关联链接。");
  }

  const next: CompetitorRecord = {
    ...competitor,
    ...patch,
    links: nextLinks,
  };
  competitors.set(id, next);
  return next;
}

export function deleteCompetitor(ownerId: string, id: string): boolean {
  const competitor = getCompetitor(ownerId, id);
  if (!competitor) return false;
  competitors.delete(id);
  return true;
}

export function createReport(ownerId: string, draft: AnalysisReportDraft): ReportRecord {
  const report: ReportRecord = {
    id: crypto.randomUUID(),
    ownerId,
    ...draft,
    createdAt: draft.changedAt,
  };
  reports.set(report.id, report);
  return report;
}

export function hydrateReports(ownerId: string, records: ReportRecord[]): void {
  for (const record of records) {
    if (record.ownerId === ownerId) {
      reports.set(record.id, record);
    }
  }
}

export function saveTask(ownerId: string, task: CollectionTask, reportId?: string): TaskRecord {
  const record: TaskRecord = {
    ...task,
    ownerId,
    ...(reportId ? { reportId } : {}),
  };
  tasks.set(record.id, record);
  return record;
}

export function hydrateTasks(ownerId: string, records: TaskRecord[]): void {
  for (const record of records) {
    if (record.ownerId === ownerId) {
      tasks.set(record.id, record);
    }
  }
}

export function getTask(ownerId: string, id: string): TaskRecord | undefined {
  const task = tasks.get(id);
  if (!task || task.ownerId !== ownerId) return undefined;
  return task;
}

export function listTasksForCompetitor(ownerId: string, competitorId: string): TaskRecord[] {
  return Array.from(tasks.values())
    .filter((task) => task.ownerId === ownerId && task.competitorId === competitorId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function mockSnapshotKey(ownerId: string, competitorId: string): string {
  return `${ownerId}:${competitorId}`;
}

export function getLastMockSnapshot(ownerId: string, competitorId: string): CollectedMockSnapshot | undefined {
  return mockSnapshots.get(mockSnapshotKey(ownerId, competitorId));
}

export function saveLastMockSnapshot(
  ownerId: string,
  competitorId: string,
  snapshot: CollectedMockSnapshot,
): CollectedMockSnapshot {
  mockSnapshots.set(mockSnapshotKey(ownerId, competitorId), snapshot);
  return snapshot;
}

export interface ReportFilters {
  competitorId?: string;
  priority?: ReportPriority;
  from?: string;
  to?: string;
}

export function listReports(ownerId: string, filters: ReportFilters = {}): ReportRecord[] {
  return Array.from(reports.values())
    .filter((report) => report.ownerId === ownerId)
    .filter((report) => !filters.competitorId || report.competitorId === filters.competitorId)
    .filter((report) => !filters.priority || report.priority === filters.priority)
    .filter((report) => {
      const created = report.createdAt.slice(0, 10);
      return (!filters.from || created >= filters.from) && (!filters.to || created <= filters.to);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getReport(ownerId: string, id: string): ReportRecord | undefined {
  const report = reports.get(id);
  if (!report || report.ownerId !== ownerId) return undefined;
  return report;
}

function readKey(ownerId: string, reportId: string): string {
  return `${ownerId}:${reportId}`;
}

export function markReportRead(ownerId: string, reportId: string): void {
  readReports.add(readKey(ownerId, reportId));
}

export function isReportRead(ownerId: string, reportId: string): boolean {
  return readReports.has(readKey(ownerId, reportId));
}

export function createFeedback(
  ownerId: string,
  reportId: string,
  input: { type: FeedbackType; wrongReason?: WrongReason },
): ReportFeedbackRecord {
  if (input.type === "wrong" && !input.wrongReason) {
    throw new Error("提交错误反馈时必须选择原因。");
  }

  const report = getReport(ownerId, reportId);
  if (!report) {
    throw new Error("报告不存在。");
  }

  const record: ReportFeedbackRecord = {
    id: crypto.randomUUID(),
    ownerId,
    reportId,
    type: input.type,
    ...(input.wrongReason ? { wrongReason: input.wrongReason } : {}),
    createdAt: new Date().toISOString(),
  };
  feedback.set(record.id, record);
  return record;
}

export function listFeedback(ownerId: string, reportId: string): ReportFeedbackRecord[] {
  return Array.from(feedback.values()).filter(
    (record) => record.ownerId === ownerId && record.reportId === reportId,
  );
}
