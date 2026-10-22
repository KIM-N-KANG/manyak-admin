import { productionDataSourceError } from '@/api/data-source-guard';
import { fixtureBody, fixtureFailure } from '@/fixtures/management-bff';
import { managementPage } from '@/fixtures/management-query';
import { createCampaign, listCampaigns } from '@/fixtures/notifications';
import { fixtureResponse, validateOptions } from '@/fixtures/query';
import { matchesSearch, readSearch } from '@/fixtures/search';

export function GET(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  return fixtureResponse(request, (q) => {
    validateOptions(q, {
      status: ['SCHEDULED', 'SENDING', 'SENT', 'CANCELED', 'FAILED'],
      kind: ['SERVICE', 'MARKETING'],
    });

    const s = readSearch(q);

    return managementPage(
      listCampaigns().filter(
        (i) =>
          matchesSearch(s, [i.title, i.body], [i.campaignId]) &&
          (!q.get('status') || i.status === q.get('status')) &&
          (!q.get('kind') || i.kind === q.get('kind')),
      ),
      q,
      {
        title: (i) => i.title,
        status: (i) => i.status,
        kind: (i) => i.kind,
        scheduledAt: (i) => i.scheduledAt,
        targetCount: (i) => i.targetCount,
        sentCount: (i) => i.sentCount,
        deliveredMembers: (i) => i.deliveredMembers,
        deliveredDevices: (i) => i.deliveredDevices,
        failedDevices: (i) => i.failedDevices,
        createdAt: (i) => i.createdAt,
      },
    );
  });
}
export async function POST(request: Request) {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  try {
    return Response.json(createCampaign(await fixtureBody(request)), {
      status: 201,
    });
  } catch (e) {
    return fixtureFailure(request, e);
  }
}
