import { productionDataSourceError } from '@/api/data-source-guard';
import { listAuditLogs } from '@/fixtures/audit-logs';
import { fixtureResponse } from '@/fixtures/query';

export function GET(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  return fixtureResponse(request, listAuditLogs);
}
