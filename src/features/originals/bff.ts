import type { OriginalSaveRequest } from '@/features/originals/types';
import { fixtureBody, fixtureFailure } from '@/fixtures/management-bff';

export async function readOriginalSave(
  request: Request,
): Promise<OriginalSaveRequest> {
  return (await fixtureBody(request)) as OriginalSaveRequest;
}
export class OriginalFixtureError extends Error {
  constructor(
    public readonly code: 'INVALID_GENRE' | 'UPLOAD_NOT_FOUND' | 'CONFLICT',
    message: string,
  ) {
    super(message);
  }
}
export function originalError(request: Request, error: unknown) {
  if (error instanceof OriginalFixtureError) {
    const status = error.code === 'CONFLICT' ? 409 : 400;

    return Response.json(
      {
        timestamp: new Date().toISOString(),
        status,
        code: error.code,
        message: error.message,
        path: new URL(request.url).pathname,
        details: [],
      },
      { status },
    );
  }

  return fixtureFailure(request, error);
}
