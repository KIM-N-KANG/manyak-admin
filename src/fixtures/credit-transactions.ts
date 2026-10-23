import type { CreditTransactionItem } from '@/features/credits/types';
import { isCreditMetric } from '@/features/members/credit-metrics';
import { members, memberTransactions } from '@/fixtures/entities';
import {
  fixtureResponse,
  kstDate,
  paginate,
  validateDate,
  validateOptions,
} from '@/fixtures/query';

export function creditTransactionsResponse(request: Request) {
  return fixtureResponse(request, (query) => {
    for (const key of query.keys())
      if (!['direction', 'date', 'sort', 'order', 'page', 'size'].includes(key))
        throw new Error('지원하지 않는 쿼리입니다.');

    validateOptions(query, {
      direction: ['granted', 'spent'],
      sort: ['createdAt'],
      order: ['asc', 'desc'],
    });

    if (query.getAll('date').length > 1)
      throw new Error('날짜는 하나만 지정하세요.');

    validateDate(query.get('date'));

    const direction = query.get('direction');
    const date = query.get('date');
    let internalId = 0;
    const rows = members.flatMap((member) =>
      (memberTransactions.get(member.memberId) ?? []).map((transaction) => ({
        internalId: ++internalId,
        transaction,
        member,
      })),
    );
    const page = paginate(
      rows
        .filter(
          ({ transaction }) =>
            (!date || kstDate(transaction.createdAt) === date) &&
            (direction !== 'granted' && direction !== 'spent'
              ? true
              : isCreditMetric(transaction, direction)),
        )
        .toSorted((a, b) => {
          const difference = a.transaction.createdAt.localeCompare(
            b.transaction.createdAt,
          );

          // 원장 행의 내부 순번은 필터 전에 부여하며 응답에는 노출하지 않는다.
          return (
            (query.get('order') === 'asc' ? difference : -difference) ||
            b.internalId - a.internalId
          );
        }),
      query,
    );
    const items: CreditTransactionItem[] = page.items.map(
      ({ transaction, member }) => ({
        amount: transaction.amount,
        reason: transaction.reason,
        createdAt: transaction.createdAt,
        member: {
          memberId: member.memberId,
          nickname: member.nickname,
          status: member.status,
          isAdmin: member.isAdmin,
          createdAt: member.createdAt,
        },
      }),
    );

    return { ...page, items };
  });
}
