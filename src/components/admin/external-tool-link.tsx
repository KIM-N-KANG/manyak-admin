import type { ReactNode } from 'react';

import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { cn } from '@/lib/utils';

export function ExternalToolLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="새 탭에서 열기"
      className={cn(
        'inline-flex min-h-10 items-center gap-2 rounded-sm text-sm text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}>
      {children}
      <HugeiconsIcon
        icon={ArrowUpRight01Icon}
        size={16}
        aria-hidden="true"
        className="shrink-0"
      />
    </a>
  );
}
