import { productionDataSourceError } from '@/api/data-source-guard';
import { fixtureFailure } from '@/fixtures/management-bff';
import { getCampaign } from '@/fixtures/notifications';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  try {
    return Response.json(getCampaign((await params).id));
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
