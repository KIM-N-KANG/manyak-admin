import { Suspense } from 'react';

import { OriginalListScreen } from '@/features/originals/original-list-screen';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">오리지널을 불러오는 중입니다…</p>}>
      <OriginalListScreen />
    </Suspense>
  );
}
