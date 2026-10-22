import { productionDataSourceError } from '@/api/data-source-guard';
import {
  type CreditDirection,
  isCreditMetric,
} from '@/features/members/credit-metrics';
import { chatBucket } from '@/fixtures/cohorts';
import {
  getChatCounts,
  getMemberTransactions,
  memberEmails,
  members,
} from '@/fixtures/entities';
import {
  fixtureResponse,
  inPeriod,
  kstDate,
  paginate,
  sortList,
  validateOptions,
} from '@/fixtures/query';
import { matchesSearch, readSearch } from '@/fixtures/search';

export function GET(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  return fixtureResponse(request, (q) => {
    const search = readSearch(q);

    validateOptions(q, {
      status: ['ACTIVE', 'SUSPENDED', 'DELETED'],
      chatBucket: ['0', '1', '2', '3', '4'],
      creditDirection: ['granted', 'spent'],
      excludeDeleted: ['true', 'false'],
    });

    if (q.has('creditDate') && !q.has('creditDirection'))
      throw new Error('거래일과 함께 지급·소진 방향을 지정하세요.');

    const periodCounts = getChatCounts(q.get('chatFrom'), q.get('chatTo'));
    const hasChatPeriod = q.has('chatFrom') || q.has('chatTo');
    const filtered = members.filter((m) => {
      const email = memberEmails.get(m.memberId);
      const matches = matchesSearch(search, [m.nickname], [m.memberId, email]);
      const count = hasChatPeriod
        ? (periodCounts.get(m.memberId) ?? 0)
        : m.chatCount;
      const bucket = chatBucket(count);
      const transactions = getMemberTransactions(m.memberId);
      const matchesCredit =
        (!q.has('creditDirection') && !q.has('creditDate')) ||
        transactions.some(
          (t) =>
            (!q.get('creditDate') ||
              kstDate(t.createdAt) === q.get('creditDate')) &&
            (!q.get('creditDirection') ||
              isCreditMetric(t, q.get('creditDirection') as CreditDirection)),
        );

      return (
        matches &&
        (q.get('excludeDeleted') !== 'true' || m.status !== 'DELETED') &&
        inPeriod(m.createdAt, q) &&
        matchesCredit &&
        (!q.get('status') || m.status === q.get('status')) &&
        (!hasChatPeriod || count > 0) &&
        (!q.has('chatBucket') || bucket === Number(q.get('chatBucket'))) &&
        (!q.get('attendanceDate') ||
          transactions.some(
            (t) =>
              t.reason === 'ATTENDANCE_REWARD' &&
              t.amount > 0 &&
              kstDate(t.createdAt) === q.get('attendanceDate'),
          ))
      );
    });

    const sorted = sortList(filtered, q, 'members', (item) => item.memberId);

    return paginate(
      sorted.map((m) =>
        hasChatPeriod
          ? { ...m, periodChatCount: periodCounts.get(m.memberId) ?? 0 }
          : { ...m, periodChatCount: null },
      ),
      q,
    );
  });
}
