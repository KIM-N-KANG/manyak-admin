import { listAuditLogs } from '@/fixtures/audit-logs';
import { fixtureResponse } from '@/fixtures/query';

export function GET(request: Request) {
  return fixtureResponse(request, listAuditLogs);
}
