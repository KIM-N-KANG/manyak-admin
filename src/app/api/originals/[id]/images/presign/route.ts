import { fixtureBody, fixtureFailure } from '@/fixtures/management-bff';
import { presignOriginal } from '@/fixtures/originals';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return Response.json(
      presignOriginal(await fixtureBody(request), (await params).id),
      { status: 201 },
    );
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
