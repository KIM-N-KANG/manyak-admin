import { CampaignFormScreen } from '@/features/notifications/campaign-form-screen';
import { validId } from '@/fixtures/query';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    storyId?: string | string[];
    noticeId?: string | string[];
  }>;
}) {
  const { storyId, noticeId } = await searchParams;

  return (
    <CampaignFormScreen
      noticeId={typeof noticeId === 'string' ? noticeId : undefined}
      storyId={
        typeof storyId === 'string' && validId(storyId) ? storyId : undefined
      }
    />
  );
}
