import { type AnalysisReportDraft } from "@lensmor/domain";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface LiteLLMReportInput {
  competitorId: string;
  competitorName: string;
  sourceUrl: string;
  promptFacts: string[];
}

export interface LiteLLMClient {
  generateReport(input: LiteLLMReportInput): Promise<AnalysisReportDraft>;
}

const defaultLiteLLMModel = "claude-sonnet-4-6";
const localEnvFiles = [".env.local", ".env"];

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

function chatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/$/, "");
  return normalized.endsWith("/v1") ? `${normalized}/chat/completions` : `${normalized}/v1/chat/completions`;
}

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("liteLLM response does not contain a JSON object");
  }
  return JSON.parse(withoutFence.slice(start, end + 1));
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter((item) => item.length > 0)
    : [];
}

function asPriority(value: unknown): AnalysisReportDraft["priority"] {
  return value === "urgent" || value === "medium" || value === "low" ? value : "medium";
}

function normalizeReport(value: unknown, input: LiteLLMReportInput): AnalysisReportDraft {
  const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    competitorId: input.competitorId,
    title: asString(record.title),
    priority: asPriority(record.priority),
    changedAt: asString(record.changedAt) || new Date().toISOString(),
    sourceUrl: input.sourceUrl,
    changeSummary: asStringArray(record.changeSummary),
    strategicIntent: asString(record.strategicIntent),
    recommendedActions: asStringArray(record.recommendedActions),
  };
}

function parseEnvLine(line: string, key: string): string | undefined {
  const match = new RegExp(`^${key}\\s*=\\s*(.*)$`).exec(line.trim());
  if (!match?.[1]) return undefined;
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

function readLocalEnvValue(key: string): string | undefined {
  let directory = resolve(process.cwd());

  for (let depth = 0; depth < 6; depth += 1) {
    for (const fileName of localEnvFiles) {
      const envPath = join(directory, fileName);
      if (!existsSync(envPath)) continue;

      const value = readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .map((line) => parseEnvLine(line, key))
        .find((item): item is string => Boolean(item));
      if (value) return value;
    }

    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  return undefined;
}

function readRuntimeEnv(key: string): string | undefined {
  return process.env[key] || readLocalEnvValue(key);
}

export function createLiteLLMClient(): LiteLLMClient {
  return {
    async generateReport(input) {
      const baseUrl = readRuntimeEnv("LITELLM_BASE_URL");
      const apiKey = readRuntimeEnv("LITELLM_API_KEY");
      const model = readRuntimeEnv("LITELLM_MODEL") ?? defaultLiteLLMModel;

      if (!baseUrl || !apiKey) {
        const missing = [
          !baseUrl ? "LITELLM_BASE_URL" : undefined,
          !apiKey ? "LITELLM_API_KEY" : undefined,
        ].filter(Boolean);
        throw new Error(`liteLLM configuration is missing: ${missing.join(", ")}`);
      }

      const response = await fetch(chatCompletionsUrl(baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "你是 Lensmor Monitor 的竞品情报分析师。只返回一个 JSON 对象，不要 Markdown，不要解释。字段必须为 title、priority、changedAt、changeSummary、strategicIntent、recommendedActions。priority 只能是 urgent、medium、low。changeSummary 和 recommendedActions 必须是中文字符串数组。",
            },
            {
              role: "user",
              content: JSON.stringify({
                competitorName: input.competitorName,
                sourceUrl: input.sourceUrl,
                facts: input.promptFacts,
                outputExample: {
                  title: "竞品关键页面发生变化",
                  priority: "medium",
                  changedAt: new Date().toISOString(),
                  changeSummary: ["用一句中文概括一个事实变化"],
                  strategicIntent: "用一段中文推断可能战略意图",
                  recommendedActions: ["给出一个可执行建议"],
                },
              }),
            },
          ],
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

      return normalizeReport(extractJsonObject(content), input);
    },
  };
}
