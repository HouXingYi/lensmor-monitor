export type DiffChangeType = "copy" | "pricing" | "feature" | "layout" | "cta" | "noise";

export interface ExpectedDiff {
  type: DiffChangeType;
  before: string;
  after: string;
  explainable: boolean;
  selector?: string;
}

export interface DiffScenario {
  id: string;
  competitor: string;
  page: string;
  beforeSnapshot: string;
  afterSnapshot: string;
  sourceUrl: string;
  expectedDiff: ExpectedDiff[];
  expectedReportHints: {
    summaryMustInclude: string[];
    intentCandidates: string[];
    actionCandidates: string[];
  };
}

export interface DiffAnalysisResult {
  scenarioId: string;
  sourceUrl: string;
  explainableChanges: ExpectedDiff[];
  noiseChanges: ExpectedDiff[];
  changeTypes: DiffChangeType[];
  promptFacts: string[];
}

export function analyzeScenarioDiff(scenario: DiffScenario): DiffAnalysisResult {
  const explainableChanges = scenario.expectedDiff.filter((change) => change.explainable);
  const noiseChanges = scenario.expectedDiff.filter((change) => !change.explainable);
  const changeTypes = Array.from(new Set(explainableChanges.map((change) => change.type)));

  return {
    scenarioId: scenario.id,
    sourceUrl: scenario.sourceUrl,
    explainableChanges,
    noiseChanges,
    changeTypes,
    promptFacts: explainableChanges.map(
      (change) => `${change.type}: changed from "${change.before}" to "${change.after}"`,
    ),
  };
}

export function shouldGenerateReport(result: DiffAnalysisResult): boolean {
  return result.explainableChanges.length > 0;
}
