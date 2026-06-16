"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const roles = [
  "产品营销经理",
  "产品经理",
  "市场经理",
  "创始人",
  "投资人",
  "其他",
];

const recommendedCompetitors = [
  { id: "acme-ai", name: "Acme AI", mainDomain: "acme-ai.mock" },
  { id: "nova-stack", name: "Nova Stack", mainDomain: "nova-stack.mock" },
  { id: "orbit-crm", name: "Orbit CRM", mainDomain: "orbit-crm.mock" },
];

interface ProductFormState {
  name: string;
  url: string;
  oneLineDescription: string;
  targetAudience: string;
  coreSellingPoints: string;
  competitiveEdge: string;
  strategicGoal: string;
}

interface ManualCompetitor {
  name: string;
  mainDomain: string;
}

const initialProduct: ProductFormState = {
  name: "Lensmor",
  url: "https://lensmor.local",
  oneLineDescription: "AI 竞品监控工作台",
  targetAudience: "产品和市场团队",
  coreSellingPoints: "自动化监控、结构化报告、反馈闭环",
  competitiveEdge: "把竞品变化转化为可行动情报",
  strategicGoal: "验证 MVP，并持续监控高价值竞品动作",
};

function trimProduct(product: ProductFormState): ProductFormState {
  return {
    name: product.name.trim(),
    url: product.url.trim(),
    oneLineDescription: product.oneLineDescription.trim(),
    targetAudience: product.targetAudience.trim(),
    coreSellingPoints: product.coreSellingPoints.trim(),
    competitiveEdge: product.competitiveEdge.trim(),
    strategicGoal: product.strategicGoal.trim(),
  };
}

function isCompleteProduct(product: ProductFormState): boolean {
  return Object.values(product).every((value) => value.length > 0);
}

function hasValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function OnboardingForm() {
  const router = useRouter();
  const [role, setRole] = useState("产品经理");
  const [product, setProduct] = useState<ProductFormState>(initialProduct);
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<string[]>(["acme-ai"]);
  const [manualCompetitors, setManualCompetitors] = useState<ManualCompetitor[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualDomain, setManualDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateProductField(field: keyof ProductFormState, value: string) {
    setProduct((current) => ({ ...current, [field]: value }));
  }

  function toggleRecommendedCompetitor(id: string) {
    setSelectedCompetitorIds((current) =>
      current.includes(id) ? current.filter((competitorId) => competitorId !== id) : [...current, id],
    );
  }

  function addManualCompetitor() {
    const name = manualName.trim();
    const mainDomain = manualDomain.trim();

    if (!name || !mainDomain) {
      setError("手动添加竞品时，名称和主域名都必填。");
      return;
    }

    setManualCompetitors((current) => [...current, { name, mainDomain }]);
    setManualName("");
    setManualDomain("");
    setError(null);
  }

  function removeManualCompetitor(index: number) {
    setManualCompetitors((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nextProduct = trimProduct(product);
    const competitors = [
      ...recommendedCompetitors
        .filter((competitor) => selectedCompetitorIds.includes(competitor.id))
        .map(({ name, mainDomain }) => ({ name, mainDomain })),
      ...manualCompetitors,
    ];

    if (!role) {
      setError("请选择一个角色。");
      return;
    }

    if (!isCompleteProduct(nextProduct)) {
      setError("请完整填写所有产品信息。");
      return;
    }

    if (!hasValidUrl(nextProduct.url)) {
      setError("请输入有效的产品 URL，需要包含 http:// 或 https://。");
      return;
    }

    if (competitors.length === 0) {
      setError("请选择或添加至少一个竞品。");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role,
        product: nextProduct,
        competitors,
      }),
    });
    setSubmitting(false);

    if (response.status === 401) {
      router.replace("/login?next=/onboarding");
      return;
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "设置失败，请检查表单后重试。");
      return;
    }

    router.replace("/competitors");
    router.refresh();
  }

  return (
    <form className="onboarding-card" onSubmit={handleSubmit}>
      <section className="onboarding-section">
        <div className="section-heading">
          <span>第 1 步，共 3 步</span>
          <h2>选择你的角色</h2>
        </div>
        <div className="role-grid">
          {roles.map((option) => (
            <label className="choice-card" key={option}>
              <input
                checked={role === option}
                name="role"
                onChange={() => setRole(option)}
                type="radio"
                value={option}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="onboarding-section">
        <div className="section-heading">
          <span>第 2 步，共 3 步</span>
          <h2>填写自有产品信息</h2>
        </div>
        <div className="product-grid">
          <label>
            <span>产品名称</span>
            <input
              onChange={(event) => updateProductField("name", event.target.value)}
              required
              value={product.name}
            />
          </label>
          <label>
            <span>产品 URL</span>
            <input
              onChange={(event) => updateProductField("url", event.target.value)}
              required
              type="url"
              value={product.url}
            />
          </label>
          <label className="wide-field">
            <span>一句话描述</span>
            <input
              onChange={(event) => updateProductField("oneLineDescription", event.target.value)}
              required
              value={product.oneLineDescription}
            />
          </label>
          <label>
            <span>目标用户</span>
            <input
              onChange={(event) => updateProductField("targetAudience", event.target.value)}
              required
              value={product.targetAudience}
            />
          </label>
          <label>
            <span>核心卖点</span>
            <input
              onChange={(event) => updateProductField("coreSellingPoints", event.target.value)}
              required
              value={product.coreSellingPoints}
            />
          </label>
          <label>
            <span>竞争优势</span>
            <input
              onChange={(event) => updateProductField("competitiveEdge", event.target.value)}
              required
              value={product.competitiveEdge}
            />
          </label>
          <label>
            <span>战略目标</span>
            <input
              onChange={(event) => updateProductField("strategicGoal", event.target.value)}
              required
              value={product.strategicGoal}
            />
          </label>
        </div>
      </section>

      <section className="onboarding-section">
        <div className="section-heading">
          <span>第 3 步，共 3 步</span>
          <h2>导入竞品</h2>
        </div>
        <div className="competitor-options">
          {recommendedCompetitors.map((competitor) => (
            <label className="choice-card competitor-choice" key={competitor.id}>
              <input
                checked={selectedCompetitorIds.includes(competitor.id)}
                onChange={() => toggleRecommendedCompetitor(competitor.id)}
                type="checkbox"
              />
              <span>
                <strong>{competitor.name}</strong>
                <small>{competitor.mainDomain}</small>
              </span>
            </label>
          ))}
        </div>

        <div className="manual-competitor">
          <h3>手动添加</h3>
          <div className="manual-row">
            <label>
              <span>名称</span>
              <input onChange={(event) => setManualName(event.target.value)} value={manualName} />
            </label>
            <label>
              <span>主域名</span>
              <input onChange={(event) => setManualDomain(event.target.value)} value={manualDomain} />
            </label>
            <button className="secondary-button" onClick={addManualCompetitor} type="button">
              添加
            </button>
          </div>
          {manualCompetitors.length > 0 ? (
            <ul className="manual-list">
              {manualCompetitors.map((competitor, index) => (
                <li key={`${competitor.name}-${competitor.mainDomain}`}>
                  <span>
                    {competitor.name} <small>{competitor.mainDomain}</small>
                  </span>
                  <button onClick={() => removeManualCompetitor(index)} type="button">
                    移除
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {error ? <div className="onboarding-error">{error}</div> : null}

      <div className="onboarding-actions">
        <button className="login-button" disabled={submitting} type="submit">
          {submitting ? "正在完成设置..." : "完成设置"}
        </button>
      </div>
    </form>
  );
}
