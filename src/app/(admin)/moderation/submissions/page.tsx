import { Suspense } from 'react';

import { SubmissionsScreen } from '@/features/moderation/submissions-screen';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">데이터를 불러오는 중입니다…</p>}>
      <SubmissionsScreen />
    </Suspense>
  );
}
