import {
  BarsSkeleton,
  ChartsSkeleton,
  SummarySkeleton,
  TableSkeleton,
} from '@/components/admin/loading-ui';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const layouts: Record<
  string,
  { summaries: number; charts: number; detail?: boolean }
> = {
  reach: { summaries: 2, charts: 0 },
  creatives: { summaries: 0, charts: 2 },
  app: { summaries: 1, charts: 3 },
  'app-activation': { summaries: 3, charts: 2 },
  'activity-volume': { summaries: 4, charts: 3 },
  activity: { summaries: 3, charts: 5, detail: true },
  signups: { summaries: 4, charts: 5, detail: true },
  sessions: { summaries: 0, charts: 2 },
  'session-lengths': { summaries: 2, charts: 2 },
  trend: { summaries: 8, charts: 9, detail: true },
  client: { summaries: 2, charts: 5 },
  'chat-options': { summaries: 3, charts: 5 },
  'ai-cost': { summaries: 3, charts: 1 },
  'turn-reach': { summaries: 2, charts: 1 },
};

export function MetricsSkeleton({ tab }: { tab: string }) {
  if (tab === 'push')
    return (
      <div className="space-y-5">
        {[7, 5].map((columns) => (
          <Card key={columns}>
            <Skeleton className="mb-4 h-7 w-36" />
            <TableSkeleton columns={columns} rows={10} pagination={false} />
          </Card>
        ))}
      </div>
    );

  if (
    ['creation', 'activation', 'story-detail', 'funnels', 'sources'].includes(
      tab,
    )
  )
    return (
      <>
        {tab !== 'sources' ? <SummarySkeleton count={3} /> : null}
        <BarsSkeleton count={tab === 'sources' ? 2 : 1} />
      </>
    );

  if (tab === 'retention')
    return (
      <>
        <SummarySkeleton count={8} />
        <TableSkeleton columns={10} rows={10} pagination={false} />
      </>
    );

  const layout = layouts[tab] ?? {
    summaries: 0,
    charts: tab === 'sources' ? 2 : 1,
  };

  return (
    <>
      {layout.summaries ? (
        <SummarySkeleton count={layout.summaries} withDetail={layout.detail} />
      ) : null}
      <ChartsSkeleton count={layout.charts} />
    </>
  );
}
