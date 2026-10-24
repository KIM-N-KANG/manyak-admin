import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { AnalyticsScreen } from '@/features/analytics/analytics-screen';

export default function Page() {
  return (
    <LoadingBoundary fallback={<PageSkeleton immediate layout="analytics" />}>
      <AnalyticsScreen screen="quality" />
    </LoadingBoundary>
  );
}
