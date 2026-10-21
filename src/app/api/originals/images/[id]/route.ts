import { bffError } from '@/api/bff-error';
import { originalAsset } from '@/fixtures/originals';
import { validId } from '@/fixtures/query';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const asset = validId(id) ? originalAsset(id) : undefined;

  return asset
    ? new Response(new Uint8Array(asset.bytes), {
        headers: {
          'Content-Type': asset.contentType,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    : bffError(request, 404, '이미지를 찾을 수 없습니다.');
}
