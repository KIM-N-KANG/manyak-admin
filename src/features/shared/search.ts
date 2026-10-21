export function normalizeSearch(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
export function searchHref(
  pathname: string,
  params: URLSearchParams,
  value: string,
) {
  const next = new URLSearchParams(params);
  const normalized = normalizeSearch(value);

  if (normalized) next.set('q', normalized);
  else next.delete('q');

  next.set('page', '1');

  return `${pathname}?${next}`;
}
