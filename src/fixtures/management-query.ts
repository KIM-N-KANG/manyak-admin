import { paginate } from '@/fixtures/query';

export function managementPage<
  T extends
    | { auditLogId: string }
    | { noticeId: string }
    | { campaignId: string },
>(
  items: T[],
  query: URLSearchParams,
  columns: Record<string, (item: T) => string | number | null>,
  defaultSort = 'createdAt',
) {
  const sort = query.get('sort') ?? defaultSort;
  const order = query.get('order') ?? 'desc';

  if (
    !Object.hasOwn(columns, sort) ||
    query.getAll('sort').length > 1 ||
    !['asc', 'desc'].includes(order) ||
    query.getAll('order').length > 1
  )
    throw new Error('정렬 조건을 확인하세요.');

  const read = columns[sort];
  const identify = (item: T) =>
    'campaignId' in item
      ? item.campaignId
      : 'auditLogId' in item
        ? item.auditLogId
        : item.noticeId;

  return paginate(
    items.toSorted((a, b) => {
      const left = read(a);
      const right = read(b);
      const tie = identify(a).localeCompare(identify(b));

      if (left === null || right === null)
        return left === right ? tie : left === null ? 1 : -1;

      const diff =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right), 'ko');

      return (order === 'asc' ? diff : -diff) || tie;
    }),
    query,
  );
}
