import { originalError } from '@/features/originals/bff';
import { uploadOriginal } from '@/fixtures/originals';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const kind = form.get('kind');

    if (
      !(file instanceof File) ||
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size < 1 ||
      file.size > 5242880 ||
      (kind !== 'COVER' && kind !== 'CHARACTER')
    )
      throw new Error(
        'JPG·PNG·WebP 이미지(1바이트~5MB)와 이미지 종류를 확인하세요.',
      );

    return Response.json(await uploadOriginal(file, kind), { status: 201 });
  } catch (error) {
    return originalError(request, error);
  }
}
