import { bffError } from '@/api/bff-error';
import { getMemberDetail, getMemberTransactions } from '@/fixtures/entities';
import { fixtureResponse, kstDate, paginate, validId } from '@/fixtures/query';

export async function memberHistoryResponse(
  request: Request,
  context: { params: Promise<{ id: string }> },
  kind: 'transactions' | 'attendance',
) {
  const { id } = await context.params;

  if (!validId(id))
    return bffError(
      request,
      400,
      '공개 식별자 형식이 올바르지 않습니다.',
      'memberId',
    );

  const member = getMemberDetail(id);

  if (!member) return bffError(request, 404, '회원을 찾을 수 없습니다.');

  return fixtureResponse(request, (query) => {
    const sort = kind === 'transactions' ? 'createdAt' : 'date';

    if (
      (query.has('sort') && query.get('sort') !== sort) ||
      query.getAll('sort').length > 1 ||
      query.getAll('order').length > 1 ||
      (query.has('order') && !['asc', 'desc'].includes(query.get('order')!))
    )
      throw new Error('정렬 조건을 확인하세요.');

    const rows = getMemberTransactions(id);

    if (kind === 'transactions')
      return paginate(
        rows.toSorted((a, b) =>
          query.get('order') === 'asc'
            ? a.createdAt.localeCompare(b.createdAt)
            : b.createdAt.localeCompare(a.createdAt),
        ),
        query,
      );

    return paginate(
      rows
        .filter((t) => t.reason === 'ATTENDANCE_REWARD' && t.amount > 0)
        .map((t) => ({ date: kstDate(t.createdAt), creditAmount: t.amount }))
        .toSorted((a, b) =>
          query.get('order') === 'asc'
            ? a.date.localeCompare(b.date)
            : b.date.localeCompare(a.date),
        ),
      query,
    );
  });
}
