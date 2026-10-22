import { Suspense } from 'react';

import { CreditTransactionsScreen } from '@/features/credits/credit-transactions-screen';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">목록을 불러오는 중입니다…</p>}>
      <CreditTransactionsScreen />
    </Suspense>
  );
}
