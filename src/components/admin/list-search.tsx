'use client';

import { useEffect, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { normalizeSearch, searchHref } from '@/features/shared/search';

export function ListSearch({ label }: { label: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const term = params.get('q') ?? '';
  const searchParams = params.toString();
  const [previousTerm, setPreviousTerm] = useState(term);
  const [value, setValue] = useState(term);
  const [submitted, setSubmitted] = useState(normalizeSearch(term));

  if (term !== previousTerm) {
    setPreviousTerm(term);
    setValue(term);
    setSubmitted(normalizeSearch(term));
  }

  useEffect(() => {
    const normalized = normalizeSearch(value);

    if (normalized === submitted || normalized.length > 50) return;

    const timer = setTimeout(() => {
      setSubmitted(normalized);
      router.replace(
        searchHref(pathname, new URLSearchParams(searchParams), value),
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [value, submitted, searchParams, pathname, router]);

  function clear() {
    setValue('');
    setSubmitted('');
    router.replace(searchHref(pathname, new URLSearchParams(params), ''));
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
        {label}
        <input
          type="search"
          value={value}
          maxLength={50}
          className="control w-full"
          placeholder="검색어를 입력하세요"
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={normalizeSearch(value).length > 50}
        />
      </label>
      <Button
        variant="outline"
        type="button"
        onClick={clear}
        disabled={!value && !term}>
        검색어 지우기
      </Button>
      {normalizeSearch(value).length > 50 ? (
        <p role="alert" className="w-full text-xs text-destructive">
          검색어는 50자 이하여야 합니다.
        </p>
      ) : null}
    </div>
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
