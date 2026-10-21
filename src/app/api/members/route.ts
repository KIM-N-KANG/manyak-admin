import {
  attendanceDates,
  creditDates,
  memberEmails,
  members,
} from '@/fixtures/entities';
import {
  fixtureResponse,
  inPeriod,
  paginate,
  validateOptions,
} from '@/fixtures/query';

export function GET(request: Request) {
  return fixtureResponse(request, (q) => {
    validateOptions(q, {
      status: ['ACTIVE', 'SUSPENDED', 'DELETED'],
      sort: ['latest', 'active', 'spent', 'paid'],
      chatBucket: ['0', '1', '2', '3', '4'],
    });

    const query = (q.get('query') ?? '').trim();

    if (query.length > 50) throw new Error('검색어는 50자 이하여야 합니다.');

    const filtered = members.filter((m) => {
      const email = memberEmails.get(m.memberId);
      const matches =
        !query ||
        (query.includes('@')
          ? email === query
          : query === m.memberId || m.nickname.includes(query));
      const count = m.chatCount;
      const bucket =
        count === 1 ? 0 : count === 2 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;

      return (
        matches &&
        inPeriod(m.createdAt, q) &&
        (!q.get('creditDate') || creditDates.includes(q.get('creditDate')!)) &&
        (!q.get('status') || m.status === q.get('status')) &&
        (!q.get('chatBucket') || bucket === Number(q.get('chatBucket'))) &&
        (!q.get('attendanceDate') ||
          attendanceDates.includes(q.get('attendanceDate')!))
      );
    });

    filtered.sort((a, b) =>
      q.get('sort') === 'spent'
        ? b.creditsSpent - a.creditsSpent
        : q.get('sort') === 'paid'
          ? b.paidKrw - a.paidKrw
          : q.get('sort') === 'active'
            ? b.lastActiveAt.localeCompare(a.lastActiveAt)
            : b.createdAt.localeCompare(a.createdAt),
    );

    return paginate(filtered, q, (m) => m.memberId);
  });
}
