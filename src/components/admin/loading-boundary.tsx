'use client';

import {
  createContext,
  type ReactNode,
  Suspense,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useSkeletonVisible } from '@/features/shared/use-skeleton-visible';

const RoutePending = createContext<(pending: boolean) => void>(() => {});

function PendingMarker({ change }: { change: (pending: boolean) => void }) {
  useEffect(() => {
    change(true);

    return () => change(false);
  }, [change]);

  return null;
}

export function RouteLoadingMarker() {
  const change = useContext(RoutePending);

  return <PendingMarker change={change} />;
}

export function LoadingBoundary({
  children,
  fallback,
}: {
  children?: ReactNode;
  fallback: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const visible = useSkeletonVisible(pending);

  return (
    <RoutePending.Provider value={setPending}>
      <div aria-busy={pending || visible}>
        {pending || visible ? (
          <div style={{ visibility: visible ? 'visible' : 'hidden' }}>
            {fallback}
          </div>
        ) : null}
        <Suspense fallback={<PendingMarker change={setPending} />}>
          <div hidden={pending || visible}>{children}</div>
        </Suspense>
      </div>
    </RoutePending.Provider>
  );
}
