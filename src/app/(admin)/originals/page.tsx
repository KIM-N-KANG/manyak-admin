import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { OriginalListScreen } from '@/features/originals/original-list-screen';

export default function Page() {
  return (
    <LoadingBoundary
      fallback={<PageSkeleton immediate columns={6} layout="list" />}>
      <OriginalListScreen />
    </LoadingBoundary>
  );
}
