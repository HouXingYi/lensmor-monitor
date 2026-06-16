import Link from "next/link";
import { redirect } from "next/navigation";

import { type ReportPriority } from "@lensmor/domain";

import { AppShell } from "../app-shell";
import {
  isReportRead,
  listCompetitors,
  listReports,
  type ReportFilters,
} from "../../lib/mvp-store";
import { hasCompletedOnboardingForPage, requirePageSession } from "../../lib/page-session";

interface InboxPageProps {
  searchParams: Promise<{
    competitorId?: string;
    priority?: string;
    from?: string;
    to?: string;
  }>;
}

function parsePriority(value: string | undefined): ReportPriority | undefined {
  if (value === "urgent" || value === "medium" || value === "low") return value;
  return undefined;
}

const priorityLabels: Record<ReportPriority, string> = {
  urgent: "紧急",
  medium: "中等",
  low: "低",
};

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const session = await requirePageSession();
  if (!(await hasCompletedOnboardingForPage())) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const filters: ReportFilters = {};
  const priority = parsePriority(params.priority);
  if (params.competitorId) filters.competitorId = params.competitorId;
  if (priority) filters.priority = priority;
  if (params.from) filters.from = params.from;
  if (params.to) filters.to = params.to;

  const competitors = listCompetitors(session.userId);
  const competitorNames = new Map(competitors.map((competitor) => [competitor.id, competitor.name]));
  const reports = listReports(session.userId, filters);

  return (
    <AppShell>
      <div className="workspace-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">情报收件箱</span>
              <h1>分析报告</h1>
              <p>按竞品、优先级和日期范围筛选报告。</p>
            </div>
            <Link className="secondary-link" href="/competitors">
              竞品
            </Link>
          </div>

          {reports.length > 0 ? (
            <div className="report-list">
              {reports.map((report) => {
                const read = isReportRead(session.userId, report.id);
                return (
                  <Link className={`report-card ${read ? "report-read" : ""}`} href={`/reports/${report.id}`} key={report.id}>
                    <div className="report-meta">
                      <span className={`priority priority-${report.priority}`}>{priorityLabels[report.priority]}</span>
                      <span>{competitorNames.get(report.competitorId) ?? "未知竞品"}</span>
                      <span>{read ? "已读" : "未读"}</span>
                    </div>
                    <strong>{report.title}</strong>
                    <p>{report.strategicIntent}</p>
                    <small>{new Date(report.createdAt).toLocaleString("zh-CN")}</small>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h2>没有找到报告</h2>
              <p>可以从竞品详情页执行手动刷新，或清空筛选条件查看全部报告。</p>
              <Link className="secondary-link" href="/inbox">
                清空筛选
              </Link>
            </div>
          )}
        </section>

        <aside className="panel">
          <span className="eyebrow">筛选条件</span>
          <h2>缩小报告范围</h2>
          <form className="stack-form" action="/inbox">
            <label>
              <span>竞品</span>
              <select defaultValue={params.competitorId ?? ""} name="competitorId">
                <option value="">全部竞品</option>
                {competitors.map((competitor) => (
                  <option key={competitor.id} value={competitor.id}>
                    {competitor.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>优先级</span>
              <select defaultValue={params.priority ?? ""} name="priority">
                <option value="">全部优先级</option>
                <option value="urgent">紧急</option>
                <option value="medium">中等</option>
                <option value="low">低</option>
              </select>
            </label>
            <label>
              <span>开始日期</span>
              <input defaultValue={params.from ?? ""} name="from" type="date" />
            </label>
            <label>
              <span>结束日期</span>
              <input defaultValue={params.to ?? ""} name="to" type="date" />
            </label>
            <button className="login-button" type="submit">
              应用筛选
            </button>
            <Link className="secondary-link center-link" href="/inbox">
              重置
            </Link>
          </form>
        </aside>
      </div>
    </AppShell>
  );
}
