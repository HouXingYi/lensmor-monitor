import { type AnalysisReportDraft } from "@lensmor/domain";

export interface LiteLLMReportInput {
  competitorId: string;
  competitorName: string;
  sourceUrl: string;
  promptFacts: string[];
}

export interface LiteLLMClient {
  generateReport(input: LiteLLMReportInput): Promise<AnalysisReportDraft>;
}

export function createMockLiteLLMClient(options: { fail?: boolean } = {}): LiteLLMClient {
  return {
    async generateReport(input) {
      if (options.fail) {
        throw new Error("liteLLM mock failure");
      }

      return {
        competitorId: input.competitorId,
        title: `${input.competitorName} website change detected`,
        priority: "medium",
        changedAt: new Date().toISOString(),
        sourceUrl: input.sourceUrl,
        changeSummary: input.promptFacts,
        strategicIntent: "Competitor is adjusting conversion messaging.",
        recommendedActions: ["Review your own positioning and CTA."],
      };
    },
  };
}

export function createLiteLLMClient(): LiteLLMClient {
  return {
    async generateReport(input) {
      const baseUrl = process.env.LITELLM_BASE_URL;
      const apiKey = process.env.LITELLM_API_KEY;

      if (!baseUrl || !apiKey) {
        throw new Error("liteLLM configuration is missing");
      }

      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "default",
          messages: [
            {
              role: "system",
              content: "Generate a concise competitor website Analysis Report as JSON.",
            },
            {
              role: "user",
              content: JSON.stringify(input),
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        throw new Error(`liteLLM request failed with ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("liteLLM response is empty");
      }

      return JSON.parse(content) as AnalysisReportDraft;
    },
  };
}
