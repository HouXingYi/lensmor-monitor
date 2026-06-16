interface CompetitorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompetitorDetailPage({ params }: CompetitorDetailPageProps) {
  const { id } = await params;

  return (
    <main>
      <h1>Competitor Overview</h1>
      <p>Competitor ID: {id}</p>
      <p>Use this page to inspect status, latest intelligence, and manual refresh entry points.</p>
    </main>
  );
}
