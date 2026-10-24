import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { SubmissionDetailScreen } from '@/features/moderation/submissions-screen';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <LoadingBoundary fallback={<PageSkeleton immediate layout="detail" />}>
      <SubmissionDetailScreen id={(await params).id} />
    </LoadingBoundary>
  );
}
