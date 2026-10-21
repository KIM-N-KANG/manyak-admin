import { bffError } from '@/api/bff-error';
import { auditLogs } from '@/fixtures/audit-logs';
import { validId } from '@/fixtures/query';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!validId(id))
    return bffError(request, 400, '식별자가 올바르지 않습니다.');

  const item = auditLogs.find((i) => i.auditLogId === id);

  return item
    ? Response.json(item)
    : bffError(request, 404, '감사 로그를 찾을 수 없습니다.');
}
