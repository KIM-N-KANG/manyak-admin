import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';

export default function DashboardPage() {
  return (
    <LoadingBoundary fallback={<PageSkeleton immediate layout="overview" />}>
      <DashboardScreen />
    </LoadingBoundary>
  );
}
