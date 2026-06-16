import { redirect } from "next/navigation";

import { AppShell } from "../app-shell";
import { listCompetitors } from "../../lib/mvp-store";
import { hasCompletedOnboardingForPage, requirePageSession } from "../../lib/page-session";
import { CompetitorsClient } from "./competitors-client";

export default async function CompetitorsPage() {
  const session = await requirePageSession();
  if (!(await hasCompletedOnboardingForPage())) {
    redirect("/onboarding");
  }
  const competitors = listCompetitors(session.userId);

  return (
    <AppShell>
      <CompetitorsClient initialCompetitors={competitors} />
    </AppShell>
  );
}
