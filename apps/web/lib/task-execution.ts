import { type TriggerType } from "@lensmor/domain";
import { createLiteLLMClient, createMockLiteLLMClient } from "@lensmor/worker/litellm-client";
import { runCollectionTask } from "@lensmor/worker/task-runner";

import {
  buildDiffScenarioFromMockPage,
  fetchMockPageSnapshot,
  selectMockPageTarget,
  toCollectedMockSnapshot,
} from "./mock-pages";
import {
  createReport,
  getCompetitor,
  getLastMockSnapshot,
  saveLastMockSnapshot,
  saveTask,
  updateCompetitor,
  type CompetitorRecord,
  type ReportRecord,
  type TaskRecord,
} from "./mvp-store";

export interface CollectionExecutionResult {
  task: TaskRecord;
  report?: ReportRecord;
}

function createRuntimeLiteLLMClient() {
  if (process.env.NODE_ENV === "test") {
    return createMockLiteLLMClient();
  }
  return createLiteLLMClient();
}

export async function executeCollectionForCompetitor(input: {
  ownerId: string;
  competitor: CompetitorRecord;
  triggerType: TriggerType;
  origin: string;
}): Promise<CollectionExecutionResult> {
  updateCompetitor(input.ownerId, input.competitor.id, { status: "collecting" });

  try {
    const target = selectMockPageTarget(input.competitor.mainDomain);
    const snapshot = await fetchMockPageSnapshot(input.origin, target);
    const previousSnapshot = getLastMockSnapshot(input.ownerId, input.competitor.id);
    const scenario = buildDiffScenarioFromMockPage(snapshot, previousSnapshot);
    const result = await runCollectionTask({
      competitor: input.competitor,
      triggerType: input.triggerType,
      scenario,
      litellm: createRuntimeLiteLLMClient(),
    });
    const report = result.report ? createReport(input.ownerId, result.report) : undefined;
    const task = saveTask(input.ownerId, result.task, report?.id);

    if (result.task.status === "completed") {
      saveLastMockSnapshot(input.ownerId, input.competitor.id, toCollectedMockSnapshot(snapshot));
    }

    return report ? { task, report } : { task };
  } finally {
    const latest = getCompetitor(input.ownerId, input.competitor.id);
    if (latest?.status === "collecting") {
      updateCompetitor(input.ownerId, input.competitor.id, { status: "monitoring" });
    }
  }
}
