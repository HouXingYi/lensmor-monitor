export type ReportPriority = "urgent" | "medium" | "low";

export interface AnalysisReportDraft {
  competitorId: string;
  title: string;
  priority: ReportPriority;
  changedAt: string;
  sourceUrl: string;
  changeSummary: readonly string[];
  strategicIntent: string;
  recommendedActions: readonly string[];
}

export interface ReportValidationResult {
  valid: boolean;
  errors: string[];
}

const priorities: readonly ReportPriority[] = ["urgent", "medium", "low"];

export function validateAnalysisReportDraft(report: AnalysisReportDraft): ReportValidationResult {
  const errors: string[] = [];

  if (!report.competitorId) errors.push("competitorId is required");
  if (!report.title) errors.push("title is required");
  if (!priorities.includes(report.priority)) errors.push("priority is invalid");
  if (!report.sourceUrl) errors.push("sourceUrl is required");
  if (report.changeSummary.length === 0) errors.push("changeSummary must not be empty");
  if (!report.strategicIntent) errors.push("strategicIntent is required");
  if (report.recommendedActions.length === 0) errors.push("recommendedActions must not be empty");

  return {
    valid: errors.length === 0,
    errors,
  };
}
