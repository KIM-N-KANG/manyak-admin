import { bffError } from '@/api/bff-error';
import { originalError, readOriginalSave } from '@/features/originals/bff';
import { getOriginal, saveOriginal } from '@/fixtures/originals';
import { validId } from '@/fixtures/query';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;

  if (!validId(id)) return bffError(request, 400, '스토리 ID를 확인하세요.');

  const item = getOriginal(id);

  return item
    ? Response.json(item)
    : bffError(request, 404, '오리지널을 찾을 수 없습니다.');
}
export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;

  if (!validId(id)) return bffError(request, 400, '스토리 ID를 확인하세요.');

  if (!getOriginal(id))
    return bffError(request, 404, '오리지널을 찾을 수 없습니다.');

  try {
    return Response.json(saveOriginal(await readOriginalSave(request), id));
  } catch (e) {
    return originalError(request, e);
  }
}
