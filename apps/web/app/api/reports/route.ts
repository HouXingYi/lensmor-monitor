import { type ReportPriority } from "@lensmor/domain";

import { requireSession } from "../../../lib/api-auth";
import { isReportRead, listReports, type ReportFilters } from "../../../lib/mvp-store";

export const runtime = "nodejs";

function parsePriority(value: string | null): ReportPriority | undefined {
  if (value === "urgent" || value === "medium" || value === "low") return value;
  return undefined;
}

export async function GET(request: Request): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  const url = new URL(request.url);
  const filters: ReportFilters = {};
  const competitorId = url.searchParams.get("competitorId");
  const priority = parsePriority(url.searchParams.get("priority"));
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (competitorId) filters.competitorId = competitorId;
  if (priority) filters.priority = priority;
  if (from) filters.from = from;
  if (to) filters.to = to;

  const reports = listReports(session.userId, filters).map((report) => ({
    ...report,
    read: isReportRead(session.userId, report.id),
  }));

  return Response.json({ reports });
}
