import { bffError } from '@/api/bff-error';
import { originalError } from '@/features/originals/bff';
import { originalAsset, putOriginalAsset } from '@/fixtures/originals';
import { validId } from '@/fixtures/query';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const asset = validId(id) ? originalAsset(id) : undefined;

  return asset?.bytes
    ? new Response(new Uint8Array(asset.bytes), {
        headers: {
          'Content-Type': asset.contentType,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    : bffError(request, 404, '이미지를 찾을 수 없습니다.');
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await putOriginalAsset((await params).id, request);

    return new Response(null, { status: 200 });
  } catch (e) {
    return originalError(request, e);
  }
}
