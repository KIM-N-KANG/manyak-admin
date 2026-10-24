import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { AuditLogListScreen } from '@/features/audit-logs/audit-log-screen';

export default function Page() {
  return (
    <LoadingBoundary
      fallback={<PageSkeleton immediate columns={6} layout="list" />}>
      <AuditLogListScreen />
    </LoadingBoundary>
  );
}
