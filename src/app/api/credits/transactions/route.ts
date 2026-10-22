import { productionDataSourceError } from '@/api/data-source-guard';
import { creditTransactionsResponse } from '@/fixtures/credit-transactions';

export function GET(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  return creditTransactionsResponse(request);
}
