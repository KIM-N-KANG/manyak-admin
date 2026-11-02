import { Suspense } from 'react';

import { LegacyRoute } from '@/features/analytics/legacy-route';

export default function Page() {
  return (
    <Suspense>
      <LegacyRoute />
    </Suspense>
  );
}
