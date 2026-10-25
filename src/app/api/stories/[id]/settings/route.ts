import { bffError } from '@/api/bff-error';
import { productionDataSourceError } from '@/api/data-source-guard';
import { validId } from '@/fixtures/query';
import { getStorySettings } from '@/fixtures/story-settings';

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
      'storyId',
    );

  const settings = getStorySettings(id);

  return settings
    ? Response.json(settings)
    : bffError(request, 404, '스토리를 찾을 수 없습니다.');
}
