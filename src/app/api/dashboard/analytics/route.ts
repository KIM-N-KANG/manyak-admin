import { bffError } from '@/api/bff-error';
import { productionDataSourceError } from '@/api/data-source-guard';
import { getDashboardAnalytics } from '@/fixtures/analytics';
import { fixtureDashboardRange } from '@/fixtures/dashboard-range';

export function GET(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  try {
    const range = fixtureDashboardRange(request, 'analytics');

    return Response.json(getDashboardAnalytics(range));
  } catch {
    return bffError(request, 400, '기간 범위를 확인하세요.', 'from');
  }
}
