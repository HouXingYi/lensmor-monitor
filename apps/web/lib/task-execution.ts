import { type AnalysisReportDraft, type TriggerType } from "@lensmor/domain";
import {
  createLiteLLMClient,
  createMockLiteLLMClient,
  type LiteLLMClient,
  type LiteLLMPromptTrace,
  type LiteLLMReportInput,
} from "@lensmor/worker/litellm-client";
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
  llmTrace: LLMTrace;
}

export interface LLMTrace {
  input?: LiteLLMReportInput;
  prompt?: LiteLLMPromptTrace;
  output?: AnalysisReportDraft;
  error?: string;
  skippedReason?: string;
}

function createRuntimeLiteLLMClient(trace: LLMTrace): LiteLLMClient {
  const client =
    process.env.NODE_ENV === "test"
      ? createMockLiteLLMClient()
      : createLiteLLMClient({
          onPrompt(prompt) {
            trace.prompt = prompt;
          },
        });

  return {
    async generateReport(input) {
      trace.input = input;

      try {
        const output = await client.generateReport(input);
        trace.output = output;
        return output;
      } catch (error) {
        trace.error = error instanceof Error ? error.message : "Unknown liteLLM error";
        throw error;
      }
    },
  };
}

export async function executeCollectionForCompetitor(input: {
  ownerId: string;
  competitor: CompetitorRecord;
  triggerType: TriggerType;
  origin: string;
}): Promise<CollectionExecutionResult> {
  updateCompetitor(input.ownerId, input.competitor.id, { status: "collecting" });
  const llmTrace: LLMTrace = {};

  try {
    const target = selectMockPageTarget(input.competitor.mainDomain);
    const snapshot = await fetchMockPageSnapshot(input.origin, target);
    const previousSnapshot = getLastMockSnapshot(input.ownerId, input.competitor.id);
    const scenario = buildDiffScenarioFromMockPage(snapshot, previousSnapshot);
    const result = await runCollectionTask({
      competitor: input.competitor,
      triggerType: input.triggerType,
      scenario,
      litellm: createRuntimeLiteLLMClient(llmTrace),
    });
    if (!llmTrace.input) {
      llmTrace.skippedReason =
        result.task.status === "failed" ? "Task failed before liteLLM was called." : "No report-worthy diff; liteLLM was not called.";
    }
    const report = result.report ? createReport(input.ownerId, result.report) : undefined;
    const task = saveTask(input.ownerId, result.task, report?.id);

    if (result.task.status === "completed") {
      saveLastMockSnapshot(input.ownerId, input.competitor.id, toCollectedMockSnapshot(snapshot));
    }

    return report ? { task, report, llmTrace } : { task, llmTrace };
  } finally {
    const latest = getCompetitor(input.ownerId, input.competitor.id);
    if (latest?.status === "collecting") {
      updateCompetitor(input.ownerId, input.competitor.id, { status: "monitoring" });
    }
  }
}
