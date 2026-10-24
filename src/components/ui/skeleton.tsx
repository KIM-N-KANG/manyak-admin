import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        'animate-pulse rounded-sm bg-muted [animation-duration:1.5s] motion-reduce:animate-none',
        className,
      )}
    />
  );
}
