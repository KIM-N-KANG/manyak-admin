import { Suspense } from 'react';

import { NoticeListScreen } from '@/features/notices/notice-list-screen';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">공지를 불러오는 중입니다…</p>}>
      <NoticeListScreen />
    </Suspense>
  );
}
