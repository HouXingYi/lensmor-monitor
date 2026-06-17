import { notFound, redirect } from "next/navigation";

import { AppShell } from "../../app-shell";
import { getCompetitor, getReport, markReportRead } from "../../../lib/mvp-store";
import { hasCompletedOnboardingForPage, requirePageSession } from "../../../lib/page-session";
import { ReportDetailClient } from "./report-detail-client";

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const session = await requirePageSession();
  if (!(await hasCompletedOnboardingForPage())) {
    redirect("/onboarding");
  }

  const { id } = await params;
  const report = getReport(session.userId, id);
  if (!report) {
    notFound();
  }
  markReportRead(session.userId, id);
  const competitor = getCompetitor(session.userId, report.competitorId);

  return (
    <AppShell>
      <ReportDetailClient
        {...(competitor ? { competitor: { id: competitor.id, name: competitor.name } } : {})}
        report={report}
      />
    </AppShell>
  );
}
