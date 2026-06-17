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

export interface LiteLLMPromptTrace {
  systemPrompt: string;
  userPrompt: string;
}

export interface LiteLLMClientOptions {
  onPrompt?: (prompt: LiteLLMPromptTrace) => void;
}

const defaultLiteLLMModel = "claude-haiku-4-5";
const localEnvFiles = [".env.local", ".env"];
const reportSystemPrompt =
  "你是 Lensmor Monitor 的竞品情报分析师。只返回一个 JSON 对象，不要 Markdown，不要解释。字段必须为 title、priority、changedAt、changeSummary、strategicIntent、recommendedActions。priority 只能是 urgent、medium、low。changeSummary 和 recommendedActions 必须是中文字符串数组。";

const changeTypeLabels: Record<string, string> = {
  copy: "文案",
  pricing: "价格",
  feature: "功能",
  layout: "布局",
  cta: "行动按钮",
  audience: "目标客群",
  proof: "客户证明",
  integration: "集成能力",
  security: "安全合规",
  enterprise: "企业方案",
  promotion: "促销活动",
  noise: "噪音",
};

function localizePromptFact(fact: string): string {
  const match = /^(?<type>\w+)(?: (?<selector>.*?))?: changed from "(?<before>.*)" to "(?<after>.*)"$/.exec(fact);
  if (!match?.groups) return fact;
  const { type: rawType, selector, before, after } = match.groups;
  if (!rawType || before === undefined || after === undefined) return fact;

  const type = changeTypeLabels[rawType] ?? rawType;
  const location = selector ? `（${selector}）` : "";
  return `${type}${location}从「${before}」改为「${after}」`;
}

function buildMockChangeSummary(input: LiteLLMReportInput): string[] {
  const summaries = input.promptFacts.map(localizePromptFact).slice(0, 6);
  if (summaries.length < 3) {
    summaries.push(`${input.competitorName} 本次变化集中在关键转化信息，值得结合页面上下文继续观察。`);
  }
  if (summaries.length < 3) {
    summaries.push("变化涉及用户决策路径中的可见内容，可能影响访客对价值和下一步动作的判断。");
  }
  return summaries;
}

export function createMockLiteLLMClient(options: { fail?: boolean } = {}): LiteLLMClient {
  return {
    async generateReport(input) {
      if (options.fail) {
        throw new Error("liteLLM mock failure");
      }

      const changeSummary = buildMockChangeSummary(input);

      return {
        competitorId: input.competitorId,
        title: `${input.competitorName} 网站变化提醒`,
        priority: "medium",
        changedAt: new Date().toISOString(),
        sourceUrl: input.sourceUrl,
        changeSummary,
        strategicIntent:
          "竞品本次不是单点微调，而是在页面表达、转化入口和价值证明之间做组合式调整。可能意图是提高高意向线索占比、强化特定客群的购买理由，并把产品能力包装成更容易被销售或管理层理解的竞争优势。",
        recommendedActions: [
          "对照自有页面检查首屏文案、价格表达和主 CTA 是否仍然清晰有力。",
          "把本次变化拆成定位、转化、产品能力三个维度，评估哪些变化可能影响近期销售沟通。",
          "让产品、市场和销售各给出一条应对动作，避免只停留在页面观测层面。",
          "下一轮监控重点关注这些变化是否继续扩展到产品页、定价页或客户案例页。",
        ],
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

export function createLiteLLMClient(options: LiteLLMClientOptions = {}): LiteLLMClient {
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

      const userPrompt = JSON.stringify({
        competitorName: input.competitorName,
        sourceUrl: input.sourceUrl,
        facts: input.promptFacts,
        writingRequirements: {
          changeSummary: "输出 3-6 条中文要点，覆盖主变化和次变化；不要只复述 facts，要补充对业务含义的简短解释。",
          strategicIntent:
            "输出一段 120-220 字中文分析，包含可能意图、影响对象、竞争含义；可以有推断，但必须基于 facts。",
          recommendedActions: "输出 3-5 条具体可执行建议，分别覆盖产品、市场、销售或后续监控动作。",
          style: "具体、克制、信息密度高，避免模板化套话。",
        },
        outputExample: {
          title: "竞品关键页面发生变化",
          priority: "medium",
          changedAt: new Date().toISOString(),
          changeSummary: [
            "用一句中文概括一个事实变化，并点出它可能影响的页面目标",
            "用一句中文概括另一个变化，说明它和主变化之间的关系",
            "用一句中文补充次要但值得观察的变化",
          ],
          strategicIntent: "用一段更完整的中文推断可能战略意图、影响对象和竞争含义。",
          recommendedActions: ["给出一个产品侧动作", "给出一个市场侧动作", "给出一个销售或后续监控动作"],
        },
      });
      options.onPrompt?.({ systemPrompt: reportSystemPrompt, userPrompt });

      const response = await fetch(chatCompletionsUrl(baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.5,
          messages: [
            {
              role: "system",
              content: reportSystemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
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
