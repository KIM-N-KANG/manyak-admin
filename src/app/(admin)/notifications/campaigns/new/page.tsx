import { CampaignFormScreen } from '@/features/notifications/campaign-form-screen';
import { validId } from '@/fixtures/query';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ storyId?: string | string[] }>;
}) {
  const { storyId } = await searchParams;

  return (
    <CampaignFormScreen
      storyId={
        typeof storyId === 'string' && validId(storyId) ? storyId : undefined
      }
    />
  );
}
