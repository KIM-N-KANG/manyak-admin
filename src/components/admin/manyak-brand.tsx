import Image from 'next/image';

import { cn } from '@/lib/utils';

export function ManyakBrand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Image src="/logo/manyak-logo.svg" alt="마냑" width={89} height={32} />
      <span className="rounded-sm border bg-muted px-2 py-1 text-xs text-muted-foreground">
        관리자
      </span>
    </div>
  );
}
