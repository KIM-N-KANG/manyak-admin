import { Suspense } from 'react';

import { AuditLogListScreen } from '@/features/audit-logs/audit-log-screen';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">감사 로그를 불러오는 중입니다…</p>}>
      <AuditLogListScreen />
    </Suspense>
  );
}
