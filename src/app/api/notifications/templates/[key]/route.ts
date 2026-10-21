import { fixtureBody, fixtureFailure } from '@/fixtures/management-bff';
import {
  getTemplate,
  resetTemplate,
  updateTemplate,
} from '@/fixtures/notifications';

type Context = { params: Promise<{ key: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    return Response.json(getTemplate((await params).key));
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    return Response.json(
      updateTemplate((await params).key, await fixtureBody(request)),
    );
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    return Response.json(
      resetTemplate((await params).key, await fixtureBody(request)),
    );
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
