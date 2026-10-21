import { ManyakLogo } from '@/components/admin/manyak-logo';
import { cn } from '@/lib/utils';

export function ManyakBrand({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="마냑 관리자"
      className={cn(
        'inline-flex items-center gap-1.5 text-primary',
        className,
      )}>
      <ManyakLogo aria-hidden="true" focusable="false" className="shrink-0" />
      <span
        aria-hidden="true"
        className="font-sans text-[27px] leading-8 font-black tracking-[-0.05em] whitespace-nowrap">
        관리자
      </span>
    </div>
  );
}
