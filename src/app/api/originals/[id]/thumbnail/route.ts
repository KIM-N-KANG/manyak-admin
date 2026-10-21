import { fixtureBody, fixtureFailure } from '@/fixtures/management-bff';
import { deleteOriginalThumbnail } from '@/fixtures/originals';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return Response.json(
      deleteOriginalThumbnail((await params).id, await fixtureBody(request)),
    );
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
