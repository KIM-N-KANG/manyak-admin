import { bffError } from '@/api/bff-error';
import type { CursorPage } from '@/features/shared/types';

export function paginate<T>(
  items: T[],
  query: URLSearchParams,
  identify: (item: T) => string,
): CursorPage<T> {
  const rawLimit = query.get('limit') ?? '50';

  if (!/^-?\d+$/.test(rawLimit))
    throw new Error('페이지 크기가 올바르지 않습니다.');

  const limit = Math.min(100, Math.max(1, Number(rawLimit)));
  const cursor = query.get('cursor');
  const index = cursor
    ? items.findIndex((item) => identify(item) === cursor)
    : -1;

  if (cursor && index === -1)
    throw new Error('페이지 커서가 올바르지 않습니다.');

  const selected = items.slice(index + 1, index + 1 + limit);

  return {
    items: selected,
    nextCursor:
      index + 1 + limit < items.length
        ? identify(selected[selected.length - 1])
        : null,
  };
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

function validateDate(value: string | null) {
  if (
    value &&
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

    if (value && !values.includes(value))
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
