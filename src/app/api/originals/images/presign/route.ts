import { productionDataSourceError } from '@/api/data-source-guard';
import { fixtureBody, fixtureFailure } from '@/fixtures/management-bff';
import { presignOriginal } from '@/fixtures/originals';

export async function POST(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  try {
    return Response.json(presignOriginal(await fixtureBody(request)), {
      status: 201,
    });
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
