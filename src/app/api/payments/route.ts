import { payments } from '@/fixtures/entities';
import {
  fixtureResponse,
  inPeriod,
  paginate,
  sortList,
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

    const sorted = sortList(filtered, q, 'payments', (item) => item.orderId);

    return paginate(
      sorted.map(({ firstPaidAt, before, after, ...order }) => {
        void firstPaidAt;
        void before;
        void after;

        return order;
      }),
      q,
    );
  });
}
