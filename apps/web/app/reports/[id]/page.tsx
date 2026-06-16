interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { id } = await params;

  return (
    <main>
      <h1>Analysis Report</h1>
      <p>Report ID: {id}</p>
      <section>
        <h2>Feedback</h2>
        <p>Submit Useful, Wrong, or Not Important feedback from this view.</p>
      </section>
    </main>
  );
}
