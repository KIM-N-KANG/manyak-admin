import { adminOperations } from '@/api/generated/admin-operations';
import { validRange } from '@/features/dashboard/date-range';

export function fixtureDashboardRange(
  request: Request,
  endpoint: 'charts' | 'analytics',
) {
  const params = new URL(request.url).searchParams;
  const path = `/api/v1/admin/dashboard/${endpoint}`;
  const operation = adminOperations.find(
    (item) => item.path === path && item.method === 'GET',
  )!;

  const input: Record<string, string> = {};

  for (const [key, value] of params) {
    if (
      !['days', 'from', 'to'].includes(key) ||
      params.getAll(key).length !== 1
    )
      throw new Error('지원하지 않는 쿼리이다.');

    input[key] = value;
  }

  const queryParameter = operation.parameters.find(
    (parameter) => parameter.in === 'query',
  )!;

  if (!operation.query?.safeParse({ [queryParameter.name]: input }).success)
    throw new Error('기간을 확인하세요.');

  const from = params.get('from'),
    to = params.get('to');

  if (from !== null || to !== null) {
    if (params.has('days') || !from || !to || !validRange({ from, to }))
      throw new Error('기간 범위를 확인하세요.');

    return { from, to };
  }

  const days = Number(params.get('days') ?? '30');

  if (![7, 30, 90].includes(days)) throw new Error('기간을 확인하세요.');

  return days;
}
