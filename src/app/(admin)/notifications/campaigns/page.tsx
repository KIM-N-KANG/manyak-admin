import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { CampaignListScreen } from '@/features/notifications/campaign-list-screen';

export default function Page() {
  return (
    <LoadingBoundary
      fallback={<PageSkeleton immediate columns={9} layout="list" />}>
      <CampaignListScreen />
    </LoadingBoundary>
  );
}
