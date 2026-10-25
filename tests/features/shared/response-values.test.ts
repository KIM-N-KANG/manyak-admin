import { expect, it } from 'vitest';

import { adminResponseValues } from '@/features/shared/response-values';

it('회원 요약의 OpenAPI admin과 실제 직렬화 isAdmin을 모두 표시한다', () => {
  const wire = {
    items: [
      { memberId: 'test', admin: true },
      { memberId: 'test2', isAdmin: true, admin: false },
    ],
  };
  const actual = adminResponseValues(wire, '/api/members?page=1');

  expect(actual).toEqual({
    items: [
      { memberId: 'test', admin: true, isAdmin: true },
      { memberId: 'test2', isAdmin: true, admin: false },
    ],
  });
  expect(wire.items[0]).not.toHaveProperty('isAdmin');
});
it('관계 회원만 정규화하고 감사 로그의 원문 before/after는 유지한다', () => {
  const before = { memberId: 'old', admin: false };
  const value = {
    items: [{ admin: { memberId: 'actor', admin: true }, before, after: null }],
  };

  expect(adminResponseValues(value, '/api/audit-logs')).toEqual({
    items: [
      {
        admin: { memberId: 'actor', admin: true, isAdmin: true },
        before,
        after: null,
      },
    ],
  });
  expect(
    adminResponseValues(
      { owner: null, recentChats: [{ member: null }] },
      '/api/stories/id',
    ),
  ).toEqual({ owner: null, recentChats: [{ member: null }] });
});
it.each(['attendance_reminder', 'credit_expiry_reminder'])(
  '%s 템플릿의 default를 처리하고 기존 isDefault를 보존한다',
  (key) => {
    expect(
      adminResponseValues(
        { effective: { default: true } },
        `/api/notifications/templates/${key}`,
      ),
    ).toEqual({ effective: { default: true, isDefault: true } });

    const fixture = { effective: { isDefault: false } };

    expect(
      adminResponseValues(fixture, `/api/notifications/templates/${key}`),
    ).toBe(fixture);
  },
);
