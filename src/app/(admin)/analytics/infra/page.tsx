import { Suspense } from 'react';

import { InfraScreen } from '@/features/analytics/infra/infra-screen';

export default function InfraPage() {
  return (
    <Suspense fallback={<p role="status">데이터를 불러오는 중입니다…</p>}>
      <InfraScreen />
    </Suspense>
  );
}
