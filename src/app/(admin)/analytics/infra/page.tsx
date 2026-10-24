import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { InfraScreen } from '@/features/analytics/infra/infra-screen';

export default function InfraPage() {
  return (
    <LoadingBoundary fallback={<PageSkeleton immediate layout="analytics" />}>
      <InfraScreen />
    </LoadingBoundary>
  );
}
