import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { CreditTransactionsScreen } from '@/features/credits/credit-transactions-screen';

export default function Page() {
  return (
    <LoadingBoundary
      fallback={<PageSkeleton immediate columns={4} layout="list" />}>
      <CreditTransactionsScreen />
    </LoadingBoundary>
  );
}
