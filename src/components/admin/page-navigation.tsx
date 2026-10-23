import Link from 'next/link';

import type { Page } from '@/features/shared/types';
import { cn } from '@/lib/utils';

export function pageNumbers(page: number, totalPages: number) {
  if (totalPages === 0) return [];

  const current = Math.min(Math.max(1, page), totalPages);
  const pages = new Set([1, totalPages]);

  const start = Math.min(Math.max(1, current - 1), Math.max(1, totalPages - 2));

  for (let value = start; value <= Math.min(totalPages, start + 2); value++)
    pages.add(value);

  const result: (number | string)[] = [];
  let previous = 0;

  for (const value of [...pages].filter((n) => n > 0).sort((a, b) => a - b)) {
    if (value - previous === 2) result.push(previous + 1);
    else if (value - previous > 2) result.push(`gap-${previous}`);

    result.push(value);
    previous = value;
  }

  return result;
}

export function PageNavigation({
  data,
  href,
  label = '목록 페이지',
}: {
  data: Pick<Page<unknown>, 'page' | 'totalPages' | 'totalElements'>;
  href: (page: number) => string;
  label?: string;
}) {
  const { page, totalPages, totalElements } = data;
  const control =
    'inline-flex h-10 min-w-10 items-center justify-center rounded-sm px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="mt-5 space-y-3">
      <p className="text-center text-xs text-muted-foreground">
        전체 {totalElements.toLocaleString('ko-KR')}건
        {totalPages > 0 ? `, ${page}페이지 / ${totalPages}페이지` : null}
      </p>
      <nav
        aria-label={label}
        className="flex flex-wrap items-center justify-center gap-1">
        {page <= 1 ? (
          <button
            type="button"
            disabled
            className={cn(control, 'text-muted-foreground opacity-50')}>
            ‹ 이전
          </button>
        ) : (
          <Link
            href={href(page > totalPages ? Math.max(1, totalPages) : page - 1)}
            className={cn(control, 'hover:bg-muted')}>
            ‹ 이전
          </Link>
        )}
        {pageNumbers(page, totalPages).map((value) =>
          typeof value === 'number' ? (
            <Link
              key={value}
              href={href(value)}
              aria-label={`${value}페이지`}
              aria-current={page === value ? 'page' : undefined}
              className={cn(
                control,
                page === value
                  ? 'bg-primary-text text-primary-foreground'
                  : 'hover:bg-muted',
              )}>
              {value}
            </Link>
          ) : (
            <span
              key={value}
              className="px-2 text-muted-foreground"
              aria-hidden="true">
              …
            </span>
          ),
        )}
        {page >= totalPages ? (
          <button
            type="button"
            disabled
            className={cn(control, 'text-muted-foreground opacity-50')}>
            다음 ›
          </button>
        ) : (
          <Link href={href(page + 1)} className={cn(control, 'hover:bg-muted')}>
            다음 ›
          </Link>
        )}
      </nav>
    </div>
  );
}
