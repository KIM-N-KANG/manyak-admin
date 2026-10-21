import { fixtureBody, fixtureFailure } from '@/fixtures/management-bff';
import { deleteNotice, getNotice, saveNotice } from '@/fixtures/notices';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    return Response.json(getNotice((await params).id));
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    return Response.json(
      saveNotice(await fixtureBody(request), (await params).id),
    );
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    deleteNotice((await params).id, await fixtureBody(request));

    return new Response(null, { status: 204 });
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
