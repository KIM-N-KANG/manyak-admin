import { memberHistoryResponse } from '@/fixtures/member-history';

export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return memberHistoryResponse(request, context, 'transactions');
}
