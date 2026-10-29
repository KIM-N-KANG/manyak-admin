import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { DomainScreen } from '@/features/analytics/domain-screen';

export default function Page() {
  return (
    <LoadingBoundary fallback={<PageSkeleton immediate layout="analytics" />}>
      <DomainScreen domain="ops" />
    </LoadingBoundary>
  );
}
