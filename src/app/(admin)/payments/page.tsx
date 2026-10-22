import { Suspense } from 'react';

import { ListScreen } from '@/features/shared/list-screen';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">목록을 불러오는 중입니다…</p>}>
      <ListScreen domain="payments" />
    </Suspense>
  );
}
