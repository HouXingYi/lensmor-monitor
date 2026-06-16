export type TaskStatus = "queued" | "collecting" | "diffing" | "analyzing" | "completed" | "failed";

export type TriggerType = "manual" | "scheduled";

export interface CollectionTask {
  id: string;
  competitorId: string;
  triggerType: TriggerType;
  status: TaskStatus;
  scheduleWindow?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const allowedTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  queued: ["collecting", "failed"],
  collecting: ["diffing", "failed"],
  diffing: ["analyzing", "completed", "failed"],
  analyzing: ["completed", "failed"],
  completed: [],
  failed: [],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function createQueuedTask(
  competitorId: string,
  triggerType: TriggerType,
  scheduleWindow?: string,
): CollectionTask {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    competitorId,
    triggerType,
    status: "queued",
    ...(scheduleWindow ? { scheduleWindow } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

export function transitionTask(task: CollectionTask, nextStatus: TaskStatus): CollectionTask {
  if (!canTransitionTask(task.status, nextStatus)) {
    throw new Error(`Invalid task transition: ${task.status} -> ${nextStatus}`);
  }

  const now = new Date().toISOString();

  return {
    ...task,
    status: nextStatus,
    updatedAt: now,
    ...(nextStatus === "completed" ? { completedAt: now } : {}),
  };
}

export function failTask(task: CollectionTask, failureReason: string): CollectionTask {
  if (task.status === "completed" || task.status === "failed") {
    throw new Error(`Cannot fail terminal task: ${task.status}`);
  }

  return {
    ...task,
    status: "failed",
    failureReason,
    updatedAt: new Date().toISOString(),
  };
}
