import { bffError } from '@/api/bff-error';
import { productionDataSourceError } from '@/api/data-source-guard';
import { getDashboardAnalytics } from '@/fixtures/analytics';

export function GET(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  const days = Number(new URL(request.url).searchParams.get('days') ?? '30');

  if (![7, 30, 90].includes(days))
    return bffError(request, 400, '기간은 7, 30, 90일 중 선택하세요.', 'days');

  return Response.json(getDashboardAnalytics(days));
}
