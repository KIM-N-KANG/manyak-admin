import { bffError } from '@/api/bff-error';
import { originalError, readOriginalSave } from '@/features/originals/bff';
import {
  getOriginal,
  saveOriginal,
  setOriginalVisibility,
} from '@/fixtures/originals';
import { validId } from '@/fixtures/query';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const detail = validId(id) ? getOriginal(id) : null;

  return detail
    ? Response.json(detail)
    : bffError(request, 404, '오리지널을 찾을 수 없습니다.');
}
export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;

  if (!validId(id) || !getOriginal(id))
    return bffError(request, 404, '오리지널을 찾을 수 없습니다.');

  try {
    const body: unknown = await request.clone().json();

    if (body && typeof body === 'object' && 'visibility' in body) {
      if (
        Object.keys(body).length !== 1 ||
        !['PUBLIC', 'PRIVATE'].includes(String(body.visibility))
      )
        throw new Error('공개 상태만 올바르게 지정하세요.');

      return Response.json(
        setOriginalVisibility(id, body.visibility as 'PUBLIC' | 'PRIVATE'),
      );
    }

    return Response.json(saveOriginal(await readOriginalSave(request), id));
  } catch (error) {
    return originalError(request, error);
  }
}
