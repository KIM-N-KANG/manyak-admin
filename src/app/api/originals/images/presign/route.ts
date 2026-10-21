import { fixtureBody, fixtureFailure } from '@/fixtures/management-bff';
import { presignOriginal } from '@/fixtures/originals';

export async function POST(request: Request) {
  try {
    return Response.json(presignOriginal(await fixtureBody(request)), {
      status: 201,
    });
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
