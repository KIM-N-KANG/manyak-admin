import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { NoticeFormScreen } from '@/features/notices/notice-form-screen';

export default function Page() {
  return (
    <LoadingBoundary fallback={<PageSkeleton immediate layout="form" />}>
      <NoticeFormScreen />
    </LoadingBoundary>
  );
}
