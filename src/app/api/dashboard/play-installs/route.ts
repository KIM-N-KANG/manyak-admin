import { productionDataSourceError } from '@/api/data-source-guard';
import { playInstalls } from '@/fixtures/play-installs';

export function GET() {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  return Response.json(playInstalls);
}
