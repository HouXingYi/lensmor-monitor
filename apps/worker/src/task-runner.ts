import {
  analyzeScenarioDiff,
  createQueuedTask,
  failTask,
  shouldGenerateReport,
  transitionTask,
  validateAnalysisReportDraft,
  type AnalysisReportDraft,
  type CollectionTask,
  type DiffScenario,
  type TriggerType,
} from "@lensmor/domain";

import { type LiteLLMClient } from "./litellm-client";

export type RunnerCompetitorStatus = "monitoring" | "paused" | "collecting";

export interface RunnerCompetitor {
  id: string;
  ownerId: string;
  name: string;
  status: RunnerCompetitorStatus;
}

export interface RunCollectionTaskInput {
  competitor: RunnerCompetitor;
  triggerType: TriggerType;
  scenario: DiffScenario;
  litellm: LiteLLMClient;
}

export interface RunCollectionTaskResult {
  task: CollectionTask;
  report?: AnalysisReportDraft;
}

export function shouldCreateScheduledTask(competitor: RunnerCompetitor): boolean {
  return competitor.status === "monitoring";
}

export async function runCollectionTask(input: RunCollectionTaskInput): Promise<RunCollectionTaskResult> {
  let task = createQueuedTask(input.competitor.id, input.triggerType);

  try {
    task = transitionTask(task, "collecting");
    task = transitionTask(task, "diffing");

    const diff = analyzeScenarioDiff(input.scenario);
    if (!shouldGenerateReport(diff)) {
      return { task: transitionTask(task, "completed") };
    }

    task = transitionTask(task, "analyzing");
    const report = await input.litellm.generateReport({
      competitorId: input.competitor.id,
      competitorName: input.competitor.name,
      sourceUrl: diff.sourceUrl,
      promptFacts: diff.promptFacts,
    });

    const validation = validateAnalysisReportDraft(report);
    if (!validation.valid) {
      throw new Error(`Invalid Analysis Report: ${validation.errors.join(", ")}`);
    }

    return {
      task: transitionTask(task, "completed"),
      report,
    };
  } catch (error) {
    return {
      task: failTask(task, error instanceof Error ? error.message : "Unknown task failure"),
    };
  }
}
