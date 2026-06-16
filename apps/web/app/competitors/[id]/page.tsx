import { notFound, redirect } from "next/navigation";

import { AppShell } from "../../app-shell";
import {
  getCompetitor,
  listReports,
  listTasksForCompetitor,
} from "../../../lib/mvp-store";
import { hasCompletedOnboardingForPage, requirePageSession } from "../../../lib/page-session";
import { CompetitorDetailClient } from "./competitor-detail-client";

interface CompetitorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompetitorDetailPage({ params }: CompetitorDetailPageProps) {
  const session = await requirePageSession();
  if (!(await hasCompletedOnboardingForPage())) {
    redirect("/onboarding");
  }

  const { id } = await params;
  const competitor = getCompetitor(session.userId, id);
  if (!competitor) {
    notFound();
  }
  const reports = listReports(session.userId, { competitorId: id });
  const latestTask = listTasksForCompetitor(session.userId, id)[0];

  return (
    <AppShell>
      <CompetitorDetailClient
        initialCompetitor={competitor}
        initialReports={reports}
        {...(latestTask ? { initialTask: latestTask } : {})}
      />
    </AppShell>
  );
}
