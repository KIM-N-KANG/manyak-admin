import { bffError } from '@/api/bff-error';
import { productionDataSourceError } from '@/api/data-source-guard';
import { payments } from '@/fixtures/entities';
import { validId } from '@/fixtures/query';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  const { id } = await context.params;

  if (!validId(id))
    return bffError(
      request,
      400,
      '공개 식별자 형식이 올바르지 않습니다.',
      'orderId',
    );

  const entity = payments.find(
    (x) => x.orderId === id && Boolean(x.completedAt),
  );

  if (!entity) return bffError(request, 404, '대상을 찾을 수 없습니다.');

  return Response.json(entity);
}
