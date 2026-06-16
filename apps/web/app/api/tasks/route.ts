import { type DiffScenario } from "@lensmor/domain";
import { createMockLiteLLMClient } from "@lensmor/worker/litellm-client";
import { runCollectionTask } from "@lensmor/worker/task-runner";

import { requireSession } from "../../../lib/api-auth";
import { createReport, getCompetitor, saveTask, updateCompetitor } from "../../../lib/mvp-store";

export const runtime = "nodejs";

interface TaskBody {
  competitorId?: string;
  triggerType?: "manual" | "scheduled";
}

const acmeCtaScenario: DiffScenario = {
  id: "cta-change",
  competitor: "acme-ai",
  page: "pricing",
  beforeSnapshot: "001-baseline.html",
  afterSnapshot: "002-cta-change.html",
  sourceUrl: "https://acme-ai.mock/pricing",
  expectedDiff: [
    {
      type: "cta",
      selector: "[data-monitor-id='primary-cta']",
      before: "Start free",
      after: "Book demo",
      explainable: true,
    },
  ],
  expectedReportHints: {
    summaryMustInclude: ["CTA", "Book demo"],
    intentCandidates: ["sales-led conversion", "qualification"],
    actionCandidates: ["review own pricing CTA", "compare demo funnel"],
  },
};

const novaCopyScenario: DiffScenario = {
  id: "copy-change",
  competitor: "nova-stack",
  page: "home",
  beforeSnapshot: "001-baseline.html",
  afterSnapshot: "003-copy-change.html",
  sourceUrl: "https://nova-stack.mock",
  expectedDiff: [
    {
      type: "copy",
      selector: "[data-monitor-id='hero-copy']",
      before: "Hero",
      after: "Move faster with AI market monitoring",
      explainable: true,
    },
  ],
  expectedReportHints: {
    summaryMustInclude: ["AI market monitoring"],
    intentCandidates: ["AI repositioning", "category framing"],
    actionCandidates: ["review own hero messaging"],
  },
};

function selectScenario(mainDomain: string): DiffScenario {
  return mainDomain.includes("nova") ? novaCopyScenario : acmeCtaScenario;
}

export async function POST(request: Request): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as TaskBody;
  if (!body.competitorId) {
    return Response.json({ error: "缺少竞品 ID。" }, { status: 400 });
  }

  const competitor = getCompetitor(session.userId, body.competitorId);
  if (!competitor) {
    return Response.json({ error: "竞品不存在。" }, { status: 404 });
  }

  if (competitor.status === "paused") {
    return Response.json({ error: "请先恢复竞品监控，再执行刷新。" }, { status: 409 });
  }

  updateCompetitor(session.userId, competitor.id, { status: "collecting" });
  const result = await runCollectionTask({
    competitor,
    triggerType: body.triggerType ?? "manual",
    scenario: selectScenario(competitor.mainDomain),
    litellm: createMockLiteLLMClient(),
  });
  const report = result.report ? createReport(session.userId, result.report) : undefined;
  const task = saveTask(session.userId, result.task, report?.id);
  updateCompetitor(session.userId, competitor.id, { status: "monitoring" });

  return Response.json({ task, report }, { status: 202 });
}
