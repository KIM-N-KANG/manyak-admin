import { productionDataSourceError } from '@/api/data-source-guard';
import { targetCount } from '@/fixtures/notifications';
import { fixtureResponse } from '@/fixtures/query';

export function GET(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  return fixtureResponse(request, (q) => targetCount(q.get('kind')));
}
