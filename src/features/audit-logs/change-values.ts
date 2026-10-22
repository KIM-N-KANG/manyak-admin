import type { AuditLog } from '@/features/audit-logs/types';

const visibleFields: Record<string, readonly [key: string, label: string][]> = {
  CREDIT_GRANTED: [
    ['balance', '이프 잔액'],
    ['amount', '지급 이프'],
  ],
  MEMBER_VIEWED: [],
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';

  if (typeof value === 'string')
    return value.replace(/[^\s@]+@[^\s@]+/g, '***@***');

  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);

  if (typeof value === 'object')
    return `복합 값 (${Object.keys(value).length}개 항목)`;

  return '표시할 수 없는 값';
}

/** 작업별 허용 항목만 표시하고 나머지 값과 키 이름은 숨긴다. */
export function auditChangeValues(
  item: Pick<AuditLog, 'action' | 'before' | 'after'>,
) {
  const fields = Object.hasOwn(visibleFields, item.action)
    ? visibleFields[item.action]
    : [];
  const before = item.before ?? {};
  const after = item.after ?? {};
  const allowed = new Set(fields.map(([key]) => key));

  return {
    rows: fields
      .filter(
        ([key]) => Object.hasOwn(before, key) || Object.hasOwn(after, key),
      )
      .map(([key, label]) => ({
        key,
        label,
        before: displayValue(
          Object.hasOwn(before, key) ? before[key] : undefined,
        ),
        after: displayValue(Object.hasOwn(after, key) ? after[key] : undefined),
      })),
    hiddenBefore: Object.keys(before).filter((key) => !allowed.has(key)).length,
    hiddenAfter: Object.keys(after).filter((key) => !allowed.has(key)).length,
  };
}
