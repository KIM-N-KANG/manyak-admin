import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { ListScreen } from '@/features/shared/list-screen';

export default function Page() {
  return (
    <LoadingBoundary
      fallback={<PageSkeleton immediate columns={6} layout="list" />}>
      <ListScreen domain="stories" />
    </LoadingBoundary>
  );
}
