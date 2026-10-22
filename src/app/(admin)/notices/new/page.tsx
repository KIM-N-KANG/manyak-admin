import { Suspense } from 'react';

import { NoticeFormScreen } from '@/features/notices/notice-form-screen';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">공지를 불러오는 중입니다…</p>}>
      <NoticeFormScreen />
    </Suspense>
  );
}
