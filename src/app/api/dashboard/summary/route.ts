import { productionDataSourceError } from '@/api/data-source-guard';
import { summary } from '@/fixtures/dashboard';

export function GET() {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  return Response.json(summary);
}
