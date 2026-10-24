import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { DashboardAnalysisScreen } from '@/features/dashboard/analysis-screen';

export default function Page() {
  return (
    <LoadingBoundary fallback={<PageSkeleton immediate layout="analytics" />}>
      <DashboardAnalysisScreen />
    </LoadingBoundary>
  );
}
