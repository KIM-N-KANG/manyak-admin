import { bffError } from '@/api/bff-error';
import {
  originalDraftSchema,
  originalPublishSchema,
} from '@/features/originals/form-schema';
import type { OriginalSaveRequest } from '@/features/originals/types';

export async function readOriginalSave(
  request: Request,
): Promise<OriginalSaveRequest> {
  const body: unknown = await request.json();

  if (
    !body ||
    typeof body !== 'object' ||
    !('status' in body) ||
    !('payload' in body) ||
    !['DRAFT', 'PUBLISHED'].includes(String(body.status))
  )
    throw new Error('저장 상태와 내용을 확인하세요.');

  const schema =
    body.status === 'PUBLISHED' ? originalPublishSchema : originalDraftSchema;
  const result = schema.safeParse(body.payload);

  if (!result.success)
    throw new Error(
      result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n'),
    );

  return {
    status: body.status as OriginalSaveRequest['status'],
    payload: result.data,
  };
}
export function originalError(request: Request, error: unknown) {
  return bffError(
    request,
    400,
    error instanceof Error ? error.message : '입력값을 확인하세요.',
  );
}
