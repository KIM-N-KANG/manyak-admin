import { bffError } from '@/api/bff-error';
import {
  defaultSort,
  listSorts,
  type SortDomain,
} from '@/features/shared/list-config';
import type { Page } from '@/features/shared/types';

export function paginate<T>(items: T[], query: URLSearchParams): Page<T> {
  const page = positiveInteger(query, 'page', 1);
  const size = positiveInteger(query, 'size', 20);

  if (size > 100) throw new Error('페이지 크기는 1~100이어야 합니다.');

  if (query.has('cursor') || query.has('limit'))
    throw new Error('page와 size로 페이지를 지정하세요.');

  const totalElements = items.length;
  const totalPages = Math.ceil(totalElements / size);

  return {
    items: page > totalPages ? [] : items.slice((page - 1) * size, page * size),
    page,
    size,
    totalElements,
    totalPages,
  };
}

function positiveInteger(
  query: URLSearchParams,
  key: string,
  fallback: number,
) {
  if (!query.has(key)) return fallback;

  const raw = query.get(key)!;
  const value = Number(raw);

  if (
    query.getAll(key).length !== 1 ||
    !/^\d+$/.test(raw) ||
    !Number.isSafeInteger(value) ||
    value < 1
  )
    throw new Error(`${key}는 1 이상의 정수여야 합니다.`);

  return value;
}

export function sortList<T>(
  items: T[],
  query: URLSearchParams,
  domain: SortDomain,
  identify: (item: T) => string,
): T[] {
  const sort = query.get('sort') ?? defaultSort[domain];
  const order = query.get('order') ?? 'desc';

  if (
    !(listSorts[domain] as readonly string[]).includes(sort) ||
    query.getAll('sort').length > 1
  )
    throw new Error('정렬 열이 올바르지 않습니다.');

  if (!['asc', 'desc'].includes(order) || query.getAll('order').length > 1)
    throw new Error('정렬 방향이 올바르지 않습니다.');

  return items.toSorted((a, b) => {
    const left = a[sort as keyof T] as number | string | null;
    const right = b[sort as keyof T] as number | string | null;
    const tie = identify(a).localeCompare(identify(b));

    if (left === null || right === null)
      return left === right ? tie : left === null ? 1 : -1;

    const difference =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right));

    return (order === 'asc' ? difference : -difference) || tie;
  });
}
export function inPeriod(value: string, query: URLSearchParams) {
  const date = kstDate(value);

  return (
    (!query.get('from') || date >= query.get('from')!) &&
    (!query.get('to') || date <= query.get('to')!)
  );
}

const kstFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
});

export function kstDate(value: string) {
  return kstFormatter.format(new Date(value));
}
export function periodFor(query: URLSearchParams, prefix: string) {
  const result = new URLSearchParams();

  for (const [key, suffix] of [
    ['from', 'From'],
    ['to', 'To'],
  ]) {
    const v = query.get(prefix + suffix);

    if (v) result.set(key, v);
  }

  return result;
}
export function validatePeriod(query: URLSearchParams) {
  for (const prefix of ['', 'chat', 'ai', 'creation']) {
    const from = prefix ? prefix + 'From' : 'from';
    const to = prefix ? prefix + 'To' : 'to';

    for (const key of [from, to]) validateDate(query.get(key));

    if (query.get(from) && query.get(to) && query.get(from)! > query.get(to)!)
      throw new Error('시작일은 종료일 이후일 수 없습니다.');
  }

  for (const key of ['attendanceDate', 'creditDate', 'turnDate'])
    validateDate(query.get(key));
}

export function validateDate(value: string | null) {
  if (
    value !== null &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      new Date(value).toISOString().slice(0, 10) !== value)
  )
    throw new Error('날짜가 올바르지 않습니다.');
}

export function validateOptions(
  query: URLSearchParams,
  options: Record<string, string[]>,
) {
  for (const [key, values] of Object.entries(options)) {
    const value = query.get(key);

    if (
      query.has(key) &&
      (!values.includes(value!) || query.getAll(key).length > 1)
    )
      throw new Error(`${key} 필터가 올바르지 않습니다.`);
  }
}
export function fixtureResponse(
  request: Request,
  read: (query: URLSearchParams) => unknown,
) {
  try {
    const query = new URL(request.url).searchParams;

    validatePeriod(query);

    for (const key of ['memberId', 'storyId', 'adminId'])
      if (
        query.has(key) &&
        (!validId(query.get(key)!) || query.getAll(key).length > 1)
      )
        throw new Error(`${key} 형식을 확인하세요.`);

    return Response.json(read(query));
  } catch (error) {
    return bffError(
      request,
      400,
      error instanceof Error ? error.message : '올바르지 않은 요청입니다.',
    );
  }
}

export function validId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}
