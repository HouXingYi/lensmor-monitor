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

const changeTypeLabels: Record<string, string> = {
  copy: "文案",
  pricing: "价格",
  feature: "功能",
  layout: "布局",
  cta: "行动按钮",
  noise: "噪音",
};

function localizePromptFact(fact: string): string {
  const match = /^(?<type>\w+): changed from "(?<before>.*)" to "(?<after>.*)"$/.exec(fact);
  if (!match?.groups) return fact;
  const { type: rawType, before, after } = match.groups;
  if (!rawType || before === undefined || after === undefined) return fact;

  const type = changeTypeLabels[rawType] ?? rawType;
  return `${type}从「${before}」改为「${after}」`;
}

export function createMockLiteLLMClient(options: { fail?: boolean } = {}): LiteLLMClient {
  return {
    async generateReport(input) {
      if (options.fail) {
        throw new Error("liteLLM mock failure");
      }

      return {
        competitorId: input.competitorId,
        title: `${input.competitorName} 网站变化提醒`,
        priority: "medium",
        changedAt: new Date().toISOString(),
        sourceUrl: input.sourceUrl,
        changeSummary: input.promptFacts.map(localizePromptFact),
        strategicIntent: "竞品正在调整转化路径和核心表达，可能希望提升销售线索质量或强化定位。",
        recommendedActions: ["复盘自有产品的定位、首屏文案和 CTA，判断是否需要跟进优化。"],
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
              content: "请用中文生成一份简洁的竞品网站变化分析报告，并以 JSON 返回。",
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
