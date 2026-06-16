import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "../../app-shell";
import { getCompetitor, getReport, markReportRead } from "../../../lib/mvp-store";
import { hasCompletedOnboardingForPage, requirePageSession } from "../../../lib/page-session";
import { ReportFeedbackForm } from "./report-feedback-form";

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

const priorityLabels = {
  urgent: "紧急",
  medium: "中等",
  low: "低",
} as const;

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const session = await requirePageSession();
  if (!(await hasCompletedOnboardingForPage())) {
    redirect("/onboarding");
  }

  const { id } = await params;
  const report = getReport(session.userId, id);
  if (!report) {
    notFound();
  }
  markReportRead(session.userId, id);
  const competitor = getCompetitor(session.userId, report.competitorId);

  return (
    <AppShell>
      <div className="report-detail">
        <article className="panel report-article">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">分析报告</span>
              <h1>{report.title}</h1>
              <p>{competitor ? competitor.name : "未知竞品"}</p>
            </div>
            <span className={`priority priority-${report.priority}`}>{priorityLabels[report.priority]}</span>
          </div>

          <dl className="report-facts">
            <div>
              <dt>变化时间</dt>
              <dd>{new Date(report.changedAt).toLocaleString("zh-CN")}</dd>
            </div>
            <div>
              <dt>来源</dt>
              <dd>
                <a href={report.sourceUrl} rel="noreferrer" target="_blank">
                  {report.sourceUrl}
                </a>
              </dd>
            </div>
          </dl>

          <section className="report-section">
            <h2>发生了什么变化</h2>
            <ul>
              {report.changeSummary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="report-section">
            <h2>战略意图</h2>
            <p>{report.strategicIntent}</p>
          </section>

          <section className="report-section">
            <h2>建议行动</h2>
            <ul>
              {report.recommendedActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <div className="toolbar">
            <Link className="secondary-link" href="/inbox">
              返回收件箱
            </Link>
            {competitor ? (
              <Link className="secondary-link" href={`/competitors/${competitor.id}`}>
                打开竞品
              </Link>
            ) : null}
          </div>
        </article>

        <ReportFeedbackForm reportId={report.id} />
      </div>
    </AppShell>
  );
}
