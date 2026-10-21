import { Suspense } from 'react';

import { CampaignListScreen } from '@/features/notifications/campaign-list-screen';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">알림 데이터를 불러오는 중입니다…</p>}>
      <CampaignListScreen />
    </Suspense>
  );
}
