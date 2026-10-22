import { Suspense } from 'react';

import { DashboardAnalysisScreen } from '@/features/dashboard/analysis-screen';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">분석을 불러오는 중입니다…</p>}>
      <DashboardAnalysisScreen />
    </Suspense>
  );
}
