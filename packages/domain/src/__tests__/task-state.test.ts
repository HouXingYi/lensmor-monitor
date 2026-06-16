import { describe, expect, it } from "vitest";

import {
  canTransitionTask,
  createQueuedTask,
  failTask,
  transitionTask,
  type CollectionTask,
} from "../task-state";

describe("collection task state machine", () => {
  it("creates queued tasks for manual and scheduled triggers", () => {
    const manual = createQueuedTask("competitor-1", "manual");
    const scheduled = createQueuedTask("competitor-1", "scheduled", "2026-06-16T08:00:00.000Z");

    expect(manual.status).toBe("queued");
    expect(manual.triggerType).toBe("manual");
    expect(scheduled.status).toBe("queued");
    expect(scheduled.scheduleWindow).toBe("2026-06-16T08:00:00.000Z");
  });

  it("allows the successful collection pipeline", () => {
    const queued = createQueuedTask("competitor-1", "manual");
    const collecting = transitionTask(queued, "collecting");
    const diffing = transitionTask(collecting, "diffing");
    const analyzing = transitionTask(diffing, "analyzing");
    const completed = transitionTask(analyzing, "completed");

    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeDefined();
  });

  it("rejects invalid transitions", () => {
    const task = createQueuedTask("competitor-1", "manual");

    expect(canTransitionTask(task.status, "completed")).toBe(false);
    expect(() => transitionTask(task, "completed")).toThrow("Invalid task transition");
  });

  it("records failure reasons without moving through completed", () => {
    const task: CollectionTask = transitionTask(createQueuedTask("competitor-1", "manual"), "collecting");
    const failed = failTask(task, "liteLLM timeout");

    expect(failed.status).toBe("failed");
    expect(failed.failureReason).toBe("liteLLM timeout");
    expect(failed.completedAt).toBeUndefined();
  });
});
