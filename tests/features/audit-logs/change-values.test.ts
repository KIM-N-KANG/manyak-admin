import { describe, expect, it } from 'vitest';

import { auditChangeValues } from '@/features/audit-logs/change-values';

describe('감사 로그 변경 값 표시', () => {
  it('작업별 허용 키를 비교하고 허용하지 않은 키는 전후 개수만 반환한다', () => {
    expect(
      auditChangeValues({
        action: 'CREDIT_GRANTED',
        before: { balance: 1230, email: 'hidden@example.test' },
        after: {
          balance: 6230,
          amount: 5000,
          nickname: '숨길 이름',
          internalToken: '숨길 토큰',
        },
      }),
    ).toEqual({
      rows: [
        { key: 'balance', label: '이프 잔액', before: '1230', after: '6230' },
        { key: 'amount', label: '지급 이프', before: '—', after: '5000' },
      ],
      hiddenBefore: 1,
      hiddenAfter: 2,
    });
  });
  it.each(['UNKNOWN_ACTION', 'MEMBER_VIEWED', '__proto__'])(
    '미등록/조회 작업 %s의 원문은 노출하지 않는다',
    (action) => {
      expect(
        auditChangeValues({
          action,
          before: { balance: 1, email: 'hidden@example.test' },
          after: { body: '숨길 원문' },
        }),
      ).toEqual({ rows: [], hiddenBefore: 2, hiddenAfter: 1 });
    },
  );
  it('이메일처럼 보이는 문자열을 문장 안에서도 전부 마스킹한다', () => {
    const changes = auditChangeValues({
      action: 'CREDIT_GRANTED',
      before: { balance: '문의 first@example.test 및 second@example.test' },
      after: { balance: '이메일 a@b' },
    });

    expect(changes.rows[0]).toMatchObject({
      before: '문의 ***@*** 및 ***@***',
      after: '이메일 ***@***',
    });
  });
  it('허용 키 안의 복합 값도 펼치지 않으며 null과 누락을 처리한다', () => {
    expect(
      auditChangeValues({
        action: 'CREDIT_GRANTED',
        before: { balance: { email: 'hidden@example.test' }, amount: null },
        after: { balance: ['hidden@example.test'] },
      }),
    ).toEqual({
      rows: [
        {
          key: 'balance',
          label: '이프 잔액',
          before: '복합 값 (1개 항목)',
          after: '복합 값 (1개 항목)',
        },
        { key: 'amount', label: '지급 이프', before: '—', after: '—' },
      ],
      hiddenBefore: 0,
      hiddenAfter: 0,
    });
    expect(
      auditChangeValues({
        action: 'CREDIT_GRANTED',
        before: null,
        after: null,
      }),
    ).toEqual({ rows: [], hiddenBefore: 0, hiddenAfter: 0 });
  });
});
