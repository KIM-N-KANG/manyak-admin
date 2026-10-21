import { bffError } from '@/api/bff-error';
import { getMemberDetail } from '@/fixtures/entities';
import { fixtureResponse, paginate, validId } from '@/fixtures/query';

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
    // 동일 시각 거래는 원장 원천의 순서를 유지한다. 내부 식별자는 노출하지 않는다.
    if (kind === 'transactions') return paginate(member.transactions, query);

    return paginate(
      member.attendance.toSorted((a, b) => b.date.localeCompare(a.date)),
      query,
    );
  });
}
