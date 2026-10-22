import { bffError } from '@/api/bff-error';
import { validId } from '@/fixtures/query';

export class FixtureError extends Error {
  constructor(
    public status: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
  }
}
export function requireFixture<T>(value: T | undefined): T {
  if (value === undefined)
    throw new FixtureError(404, '대상을 찾을 수 없습니다.');

  return value;
}
export function checkFixtureId(id: string) {
  if (!validId(id)) throw new FixtureError(400, '식별자가 올바르지 않습니다.');
}
export function fixtureFailure(request: Request, error: unknown) {
  if (error instanceof FixtureError && error.status === 409)
    return Response.json(
      {
        timestamp: new Date().toISOString(),
        status: 409,
        code: 'CONFLICT',
        message: error.message,
        path: new URL(request.url).pathname,
        details: [],
      },
      { status: 409 },
    );

  return bffError(
    request,
    error instanceof FixtureError ? (error.status as 400 | 404) : 400,
    error instanceof Error ? error.message : '입력값을 확인하세요.',
  );
}
export async function fixtureBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const body: unknown = await request.json();

  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new Error('본문을 확인하세요.');

  return body as Record<string, unknown>;
}
export function textField(
  body: Record<string, unknown>,
  key: string,
  max: number,
) {
  const value = body[key];

  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`${key}: 1~${max}자로 입력하세요.`);

  return value;
}
export function readReason(body: Record<string, unknown>) {
  return textField(body, 'reason', 500);
}
