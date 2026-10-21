import { payments } from '@/fixtures/entities';
import {
  fixtureResponse,
  inPeriod,
  paginate,
  validateOptions,
} from '@/fixtures/query';

export function GET(request: Request) {
  return fixtureResponse(request, (q) => {
    validateOptions(q, { status: ['COMPLETED', 'REFUNDED'] });

    const filtered = payments.filter(
      (p) =>
        (!q.get('status') || p.status === q.get('status')) &&
        (!q.get('memberId') || p.member.memberId === q.get('memberId')) &&
        inPeriod(p.completedAt, q),
    );

    filtered.sort(
      (a, b) =>
        b.completedAt.localeCompare(a.completedAt) ||
        a.orderId.localeCompare(b.orderId),
    );

    return paginate(
      filtered.map(({ firstPaidAt, before, after, ...order }) => {
        void firstPaidAt;
        void before;
        void after;

        return order;
      }),
      q,
      (p) => p.orderId,
    );
  });
}
