import { Suspense } from 'react';

import { DashboardScreen } from '@/features/dashboard/dashboard-screen';

export default function DashboardPage() {
  return (
    <Suspense fallback={<p role="status">대시보드를 불러오는 중입니다…</p>}>
      <DashboardScreen />
    </Suspense>
  );
}
