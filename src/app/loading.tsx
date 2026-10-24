import { RouteLoadingMarker } from '@/components/admin/loading-boundary';
import { ShellSkeleton } from '@/components/admin/loading-ui';

export default function Loading() {
  return <RouteLoadingMarker fallback={<ShellSkeleton />} />;
}
