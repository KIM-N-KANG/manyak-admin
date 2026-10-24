import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { NoticeListScreen } from '@/features/notices/notice-list-screen';

export default function Page() {
  return (
    <LoadingBoundary
      fallback={<PageSkeleton immediate columns={4} layout="list" />}>
      <NoticeListScreen />
    </LoadingBoundary>
  );
}
