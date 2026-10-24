'use client';

import { useEffect, useRef, useState } from 'react';

import { skeletonDelayMs, skeletonMinimumMs } from './loading-timing';

export function useSkeletonVisible(pending: boolean, immediate = false) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    const delay = pending
      ? immediate
        ? 0
        : skeletonDelayMs
      : shownAt.current === null
        ? 0
        : Math.max(
            0,
            skeletonMinimumMs - (performance.now() - shownAt.current),
          );
    const timer = setTimeout(() => {
      if (pending) {
        shownAt.current ??= performance.now();
        setVisible(true);
      } else {
        shownAt.current = null;
        setVisible(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [pending, immediate]);

  return visible;
}
