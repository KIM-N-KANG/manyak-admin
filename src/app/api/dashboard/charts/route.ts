import { bffError } from '@/api/bff-error';
import { productionDataSourceError } from '@/api/data-source-guard';
import { getDashboardCharts } from '@/fixtures/dashboard';
import { fixtureDashboardRange } from '@/fixtures/dashboard-range';

export function GET(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  try {
    const range = fixtureDashboardRange(request, 'charts');

    return Response.json(getDashboardCharts(range));
  } catch {
    return bffError(request, 400, '기간 범위를 확인하세요.', 'from');
  }
}
