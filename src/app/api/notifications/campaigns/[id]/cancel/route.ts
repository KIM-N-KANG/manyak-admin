import { productionDataSourceError } from '@/api/data-source-guard';
import { fixtureBody, fixtureFailure } from '@/fixtures/management-bff';
import { changeCampaign } from '@/fixtures/notifications';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  try {
    return Response.json(
      changeCampaign((await params).id, 'cancel', await fixtureBody(request)),
    );
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
