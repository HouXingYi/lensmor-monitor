import { shouldCreateScheduledTask, type RunnerCompetitor } from "./task-runner";

export function selectCompetitorsForScheduledRun(competitors: RunnerCompetitor[]): RunnerCompetitor[] {
  return competitors.filter(shouldCreateScheduledTask);
}
