"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { type CompetitorRecord } from "../../lib/mvp-store";

const statusLabels: Record<CompetitorRecord["status"], string> = {
  monitoring: "监控中",
  paused: "已暂停",
  collecting: "采集中",
};

export function CompetitorsClient({ initialCompetitors }: { initialCompetitors: CompetitorRecord[] }) {
  const router = useRouter();
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [name, setName] = useState("");
  const [mainDomain, setMainDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function createCompetitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      name: name.trim(),
      mainDomain: mainDomain.trim(),
      links: [],
    };

    if (!payload.name || !payload.mainDomain) {
      setError("竞品名称和主域名都必填。");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "创建竞品失败。");
      return;
    }

    const created = (await response.json()) as CompetitorRecord;
    setCompetitors((current) => [created, ...current]);
    setName("");
    setMainDomain("");
    router.refresh();
  }

  async function updateStatus(competitor: CompetitorRecord) {
    const nextStatus = competitor.status === "paused" ? "monitoring" : "paused";
    const response = await fetch(`/api/competitors/${competitor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "更新竞品失败。");
      return;
    }

    const updated = (await response.json()) as CompetitorRecord;
    setCompetitors((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    router.refresh();
  }

  async function deleteCompetitor(competitorId: string) {
    const response = await fetch(`/api/competitors/${competitorId}`, { method: "DELETE" });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "删除竞品失败。");
      return;
    }

    setCompetitors((current) => current.filter((competitor) => competitor.id !== competitorId));
    router.refresh();
  }

  return (
    <div className="workspace-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">竞品</span>
            <h1>监控工作台</h1>
          </div>
          <Link className="secondary-link" href="/inbox">
            打开收件箱
          </Link>
        </div>

        {competitors.length > 0 ? (
          <div className="competitor-list">
            {competitors.map((competitor) => (
              <article className="competitor-card" key={competitor.id}>
                <div>
                  <h2>
                    <Link href={`/competitors/${competitor.id}`}>{competitor.name}</Link>
                  </h2>
                  <p>{competitor.mainDomain}</p>
                </div>
                <span className={`status-pill status-${competitor.status}`}>{statusLabels[competitor.status]}</span>
                <div className="card-actions">
                  <Link href={`/competitors/${competitor.id}`}>查看详情</Link>
                  <button onClick={() => updateStatus(competitor)} type="button">
                    {competitor.status === "paused" ? "恢复" : "暂停"}
                  </button>
                  <button className="danger-action" onClick={() => deleteCompetitor(competitor.id)} type="button">
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>还没有竞品</h2>
            <p>添加至少一个竞品后，即可开始监控网站变化。</p>
          </div>
        )}
      </section>

      <aside className="panel">
        <span className="eyebrow">添加竞品</span>
        <h2>追踪另一个模拟竞品</h2>
        <form className="stack-form" onSubmit={createCompetitor}>
          <label>
            <span>名称</span>
            <input onChange={(event) => setName(event.target.value)} placeholder="Orbit CRM" value={name} />
          </label>
          <label>
            <span>主域名</span>
            <input
              onChange={(event) => setMainDomain(event.target.value)}
              placeholder="orbit-crm.mock"
              value={mainDomain}
            />
          </label>
          {error ? <div className="onboarding-error">{error}</div> : null}
          <button className="login-button" disabled={submitting} type="submit">
            {submitting ? "添加中..." : "+ 添加竞品"}
          </button>
        </form>
      </aside>
    </div>
  );
}
