import { normalizeSearch } from '@/features/shared/search';

export function readSearch(params: URLSearchParams) {
  const value = normalizeSearch(params.get('q') ?? '');

  if (
    (params.has('q') && !value) ||
    value.length > 50 ||
    params.getAll('q').length > 1
  )
    throw new Error('검색어는 50자 이하로 한 번만 지정하세요.');

  return value;
}
export function matchesSearch(
  value: string,
  partial: string[],
  exact: (string | undefined)[] = [],
) {
  return (
    !value ||
    partial.some((entry) => normalizeSearch(entry).includes(value)) ||
    exact.some(
      (entry) => entry !== undefined && normalizeSearch(entry) === value,
    )
  );
}
