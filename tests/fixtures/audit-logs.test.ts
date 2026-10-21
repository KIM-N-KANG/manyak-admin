import { describe, expect, it } from 'vitest';

import { listAuditLogs } from '@/fixtures/audit-logs';

describe('감사 로그 목록', () => {
  it('페이지와 기간 필터를 적용한다', () => {
    const page = listAuditLogs(new URLSearchParams('page=2&size=10&order=asc'));

    expect(page.items).toHaveLength(10);
    expect(page.totalElements).toBe(47);
    expect(page.items[0].createdAt < page.items[9].createdAt).toBe(true);
    expect(
      listAuditLogs(new URLSearchParams('from=2026-10-21')).items.every(
        (i) => Date.parse(i.createdAt) >= Date.parse('2026-10-20T15:00:00Z'),
      ),
    ).toBe(true);
  });
  it('대상 종류 없는 ID와 잘못된 처리자·정렬을 거절한다', () => {
    for (const q of ['targetId=x', 'adminId=x', 'sort=unknown', 'page=0'])
      expect(() => listAuditLogs(new URLSearchParams(q))).toThrow();
  });
});
