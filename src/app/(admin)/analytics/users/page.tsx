import { Suspense } from 'react';

import { AnalyticsScreen } from '@/features/analytics/analytics-screen';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">데이터를 불러오는 중입니다…</p>}>
      <AnalyticsScreen screen="users" />
    </Suspense>
  );
}
