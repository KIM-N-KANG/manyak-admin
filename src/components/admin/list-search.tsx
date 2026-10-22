'use client';

import type { FormEvent, ReactNode } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button, buttonVariants } from '@/components/ui/button';
import { normalizeSearch, searchHref } from '@/features/shared/search';

export function ListFilterForm({
  label,
  placeholder = '검색어를 입력하세요',
  children,
  searchEnabled = true,
}: {
  label: string;
  placeholder?: string;
  children?: ReactNode;
  searchEnabled?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams(params);

    for (const [key, entry] of form.entries()) {
      const value =
        key === 'q' ? normalizeSearch(String(entry)) : String(entry).trim();

      if (value) next.set(key, value);
      else next.delete(key);
    }

    next.set('page', '1');
    router.push(`${pathname}?${next}`);
  }

  return (
    <form
      key={params.toString()}
      onSubmit={submit}
      aria-label={`${label} 및 필터`}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-md border bg-card p-4">
      {searchEnabled ? (
        <label className="flex min-w-0 flex-1 basis-full flex-col gap-2 text-xs text-muted-foreground sm:min-w-60 sm:basis-72">
          {label}
          <input
            type="search"
            name="q"
            defaultValue={params.get('q') ?? ''}
            maxLength={50}
            className="control w-full"
            placeholder={placeholder}
          />
        </label>
      ) : null}
      {children}
      <Button type="submit">적용</Button>
      <Link href={pathname} className={buttonVariants({ variant: 'outline' })}>
        초기화
      </Link>
    </form>
  );
}

export function SearchEmpty() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <p>“{params.get('q')}” 검색 결과가 없습니다.</p>
      <Button
        variant="outline"
        type="button"
        onClick={() =>
          router.replace(searchHref(pathname, new URLSearchParams(params), ''))
        }>
        검색어 지우기
      </Button>
    </div>
  );
}
