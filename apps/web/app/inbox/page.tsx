import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { type ReportPriority } from "@lensmor/domain";

import { AppShell } from "../app-shell";
import {
  isReportRead,
  listCompetitors,
  listReports,
  type ReportFilters,
} from "../../lib/mvp-store";
import { hydrateCompetitorsFromCookie } from "../../lib/mvp-persistence";
import { hasCompletedOnboardingForPage, requirePageSession } from "../../lib/page-session";
import { InboxClient } from "./inbox-client";

interface InboxPageProps {
  searchParams: Promise<{
    competitorId?: string;
    priority?: string;
    from?: string;
    to?: string;
  }>;
}

function parsePriority(value: string | undefined): ReportPriority | undefined {
  if (value === "urgent" || value === "medium" || value === "low") return value;
  return undefined;
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const session = await requirePageSession();
  if (!(await hasCompletedOnboardingForPage())) {
    redirect("/onboarding");
  }
  const cookieStore = await cookies();
  hydrateCompetitorsFromCookie(session.userId, cookieStore.toString());

  const params = await searchParams;
  const filters: ReportFilters = {};
  const priority = parsePriority(params.priority);
  if (params.competitorId) filters.competitorId = params.competitorId;
  if (priority) filters.priority = priority;
  if (params.from) filters.from = params.from;
  if (params.to) filters.to = params.to;

  const competitors = listCompetitors(session.userId);
  const competitorNames = new Map(competitors.map((competitor) => [competitor.id, competitor.name]));
  const reports = listReports(session.userId, filters);

  return (
    <AppShell>
      <InboxClient
        competitors={competitors}
        initialFilters={params}
        reports={reports.map((report) => ({
          ...report,
          competitorName: competitorNames.get(report.competitorId) ?? "未知竞品",
          read: isReportRead(session.userId, report.id),
        }))}
      />
    </AppShell>
  );
}
