'use client';

import {
  createContext,
  type ReactNode,
  Suspense,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';

import { useSkeletonVisible } from '@/features/shared/use-skeleton-visible';

type PendingMode = false | 'client' | 'server';

type PendingContext = {
  change: (mode: PendingMode) => void;
  fallback: ReactNode;
};

const RoutePending = createContext<PendingContext | null>(null);
const subscribe = () => () => {};
const ignorePending = () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function PendingMarker({ change, fallback }: PendingContext) {
  const hydrated = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );
  const [serverRendered] = useState(!hydrated);

  useEffect(() => {
    change(serverRendered ? 'server' : 'client');

    return () => change(false);
  }, [change, serverRendered]);

  return hydrated ? null : <div aria-busy="true">{fallback}</div>;
}

export function RouteLoadingMarker({
  fallback = null,
}: {
  fallback?: ReactNode;
}) {
  const context = useContext(RoutePending);

  return (
    <PendingMarker
      change={context?.change ?? ignorePending}
      fallback={context?.fallback ?? fallback}
    />
  );
}

export function LoadingBoundary({
  children,
  fallback,
}: {
  children?: ReactNode;
  fallback: ReactNode;
}) {
  const [pending, setPending] = useState<PendingMode>(false);
  const visible = useSkeletonVisible(Boolean(pending), pending === 'server');
  const show = pending === 'server' || visible;

  return (
    <RoutePending.Provider value={{ change: setPending, fallback }}>
      <div aria-busy={Boolean(pending) || visible}>
        {pending || visible ? (
          <div style={{ visibility: show ? 'visible' : 'hidden' }}>
            {fallback}
          </div>
        ) : null}
        <Suspense
          fallback={<PendingMarker change={setPending} fallback={fallback} />}>
          <div hidden={Boolean(pending) || visible}>{children}</div>
        </Suspense>
      </div>
    </RoutePending.Provider>
  );
}
