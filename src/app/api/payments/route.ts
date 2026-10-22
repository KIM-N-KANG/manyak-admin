import { productionDataSourceError } from '@/api/data-source-guard';
import { payments } from '@/fixtures/entities';
import {
  fixtureResponse,
  inPeriod,
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

    validateOptions(q, { status: ['COMPLETED', 'REFUNDED'] });

    const filtered = payments.filter(
      (p) =>
        matchesSearch(
          search,
          [p.member.nickname],
          [p.orderId, p.member.memberId],
        ) &&
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
