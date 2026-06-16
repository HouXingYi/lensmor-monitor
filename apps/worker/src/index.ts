export { createLiteLLMClient, createMockLiteLLMClient } from "./litellm-client";
export { selectCompetitorsForScheduledRun } from "./scheduler";
export { runCollectionTask, shouldCreateScheduledTask } from "./task-runner";

export function startWorker(): string {
  return "worker-ready";
}

if (process.env.NODE_ENV !== "test") {
  console.log(startWorker());
}
