import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { StatsScreen } from '@/features/notifications/stats-screen';

export default function Page() {
  return (
    <LoadingBoundary fallback={<PageSkeleton immediate layout="analytics" />}>
      <StatsScreen />
    </LoadingBoundary>
  );
}
