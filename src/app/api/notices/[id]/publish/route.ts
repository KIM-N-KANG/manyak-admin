import { fixtureBody, fixtureFailure } from '@/fixtures/management-bff';
import { publishNotice } from '@/fixtures/notices';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return Response.json(
      publishNotice((await params).id, await fixtureBody(request)),
    );
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
