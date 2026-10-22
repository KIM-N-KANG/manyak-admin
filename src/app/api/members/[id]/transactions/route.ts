import { productionDataSourceError } from '@/api/data-source-guard';
import { memberHistoryResponse } from '@/fixtures/member-history';

export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  return memberHistoryResponse(request, context, 'transactions');
}
