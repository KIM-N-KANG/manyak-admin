import { productionDataSourceError } from '@/api/data-source-guard';
import { originalError, readOriginalSave } from '@/features/originals/bff';
import { listOriginals, saveOriginal } from '@/fixtures/originals';
import {
  fixtureResponse,
  paginate,
  sortList,
  validateOptions,
} from '@/fixtures/query';
import { matchesSearch, readSearch } from '@/fixtures/search';

export function GET(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  return fixtureResponse(request, (query) => {
    const search = readSearch(query);

    validateOptions(query, {
      visibility: ['PUBLIC', 'PRIVATE'],
      status: ['DRAFT', 'PUBLISHED'],
    });

    const items = listOriginals().filter(
      (item) =>
        matchesSearch(search, [item.title], [item.storyId]) &&
        (!query.get('visibility') ||
          item.visibility === query.get('visibility')) &&
        (!query.get('status') || item.status === query.get('status')),
    );

    return paginate(
      sortList(items, query, 'originals', (item) => item.storyId),
      query,
    );
  });
}
export async function POST(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  try {
    return Response.json(saveOriginal(await readOriginalSave(request)), {
      status: 201,
    });
  } catch (error) {
    return originalError(request, error);
  }
}
