import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { SubmissionsScreen } from '@/features/moderation/submissions-screen';

export default function Page() {
  return (
    <LoadingBoundary
      fallback={<PageSkeleton immediate columns={11} layout="list" />}>
      <SubmissionsScreen />
    </LoadingBoundary>
  );
}
