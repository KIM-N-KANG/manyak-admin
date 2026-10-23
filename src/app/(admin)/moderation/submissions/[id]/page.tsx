import { Suspense } from 'react';

import { SubmissionDetailScreen } from '@/features/moderation/submissions-screen';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p role="status">데이터를 불러오는 중입니다…</p>}>
      <SubmissionDetailScreen id={(await params).id} />
    </Suspense>
  );
}
