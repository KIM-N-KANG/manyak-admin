import { productionDataSourceError } from '@/api/data-source-guard';
import { fixtureBody, fixtureFailure } from '@/fixtures/management-bff';
import { presignOriginal } from '@/fixtures/originals';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  try {
    return Response.json(
      presignOriginal(await fixtureBody(request), (await params).id),
      { status: 201 },
    );
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
