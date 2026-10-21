import { fixtureBody, fixtureFailure } from '@/fixtures/management-bff';
import { managementPage } from '@/fixtures/management-query';
import { listNotices, saveNotice } from '@/fixtures/notices';
import { fixtureResponse, validateOptions } from '@/fixtures/query';
import { matchesSearch, readSearch } from '@/fixtures/search';

export function GET(request: Request) {
  return fixtureResponse(request, (q) => {
    validateOptions(q, { status: ['DRAFT', 'PUBLISHED'] });

    const s = readSearch(q);

    return managementPage(
      listNotices().filter(
        (i) =>
          (!q.get('status') || i.status === q.get('status')) &&
          matchesSearch(s, [i.title], [i.noticeId]),
      ),
      q,
      {
        title: (i) => i.title,
        status: (i) => i.status,
        publishedAt: (i) => i.publishedAt,
        notifiedAt: (i) => i.notifiedAt,
        createdAt: (i) => i.createdAt,
        updatedAt: (i) => i.updatedAt,
      },
    );
  });
}
export async function POST(request: Request) {
  try {
    return Response.json(saveNotice(await fixtureBody(request)), {
      status: 201,
    });
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
