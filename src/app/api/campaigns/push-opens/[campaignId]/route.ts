import { NextRequest } from 'next/server';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import { validateAdminRequest } from '@/api/admin-validation';
import { productionDataSourceError } from '@/api/data-source-guard';
import { fixtureFailure } from '@/fixtures/management-bff';
import { getCampaignOpens } from '@/fixtures/notification-opens';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const guard = productionDataSourceError();

  if (guard) return guard;

  try {
    const { campaignId } = await params;
    const endpoint = findAdminEndpoint(
      `/campaigns/push-opens/${campaignId}`,
      'GET',
    );

    if (!endpoint?.operation || !endpoint.serverPath)
      throw new Error('지원하지 않는 경로입니다.');

    await validateAdminRequest(
      new NextRequest(request.url),
      endpoint.operation,
      endpoint.serverPath,
      endpoint.operation.path,
    );

    return Response.json(getCampaignOpens(campaignId));
  } catch (error) {
    return fixtureFailure(request, error);
  }
}
