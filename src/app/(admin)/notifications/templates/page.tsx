import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { PageSkeleton } from '@/components/admin/loading-ui';
import { TemplateScreen } from '@/features/notifications/template-screen';

export default function Page() {
  return (
    <LoadingBoundary fallback={<PageSkeleton immediate layout="form" />}>
      <TemplateScreen />
    </LoadingBoundary>
  );
}
