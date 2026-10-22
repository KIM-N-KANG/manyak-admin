import type { AuditLog } from '@/features/audit-logs/types';
import { managementPage } from '@/fixtures/management-query';
import { inPeriod, validateOptions, validId } from '@/fixtures/query';
import { matchesSearch, readSearch } from '@/fixtures/search';

export const auditLogs: AuditLog[] = Array.from({ length: 47 }, (_, i) => ({
  auditLogId: `a1000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  admin: {
    memberId: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
    nickname: '고요한 서고',
    status: 'ACTIVE',
    isAdmin: true,
    createdAt: '2026-07-01T09:00:00Z',
  },
  category: i % 3 === 0 ? 'ACCESS' : 'CHANGE',
  action: i % 3 === 0 ? 'MEMBER_VIEWED' : 'CREDIT_GRANTED',
  targetType: 'MEMBER',
  targetId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  reason: i % 3 === 0 ? null : '결제 오류 보상',
  before: i % 3 === 0 ? null : { balance: 1230 },
  after: i % 3 === 0 ? null : { balance: 6230, amount: 5000 },
  requestId: `req_fixture_${i + 1}`,
  createdAt: new Date(Date.UTC(2026, 9, 21, 3) - i * 3600000).toISOString(),
}));
export function listAuditLogs(query: URLSearchParams) {
  if (query.get('adminId') && !validId(query.get('adminId')!))
    throw new Error('처리자 ID는 UUID여야 합니다.');

  if (query.get('targetId') && !query.get('targetType'))
    throw new Error('대상 ID는 대상 종류와 함께 지정하세요.');

  validateOptions(query, { category: ['CHANGE', 'ACCESS'] });

  const search = readSearch(query);
  const items = auditLogs.filter(
    (item) =>
      matchesSearch(
        search,
        [item.admin.nickname, item.action, item.reason ?? ''],
        [item.auditLogId, item.targetId],
      ) &&
      ['action', 'targetType', 'targetId'].every(
        (key) => !query.get(key) || item[key as 'action'] === query.get(key),
      ) &&
      (!query.get('adminId') || item.admin.memberId === query.get('adminId')) &&
      (!query.get('category') || item.category === query.get('category')) &&
      inPeriod(item.createdAt, query),
  );

  return managementPage(items, query, {
    createdAt: (i) => i.createdAt,
    action: (i) => i.action,
    category: (i) => i.category,
    admin: (i) => i.admin.nickname,
    targetType: (i) => i.targetType,
  });
}
