import { NextRequest } from 'next/server';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import { validateAdminRequest } from '@/api/admin-validation';
import { bffError } from '@/api/bff-error';
import { productionDataSourceError } from '@/api/data-source-guard';
import {
  defaultPeriod,
  shiftDate,
  tabLimits,
} from '@/features/analytics/range';
import { getRangeError, kstToday } from '@/features/dashboard/date-range';

import { campaignCatalog, metricFixture } from './metrics';

/** 고정 데이터에서도 생성 스키마 검증과 기간 정책을 적용한다. */
export async function metricsRoute(request: Request) {
  const guard = productionDataSourceError();

  if (guard) return guard;

  try {
    const url = new URL(request.url),
      path = url.pathname.replace(/^\/api/, '');
    const endpoint = findAdminEndpoint(path, 'GET');

    if (!endpoint?.operation || !endpoint.serverPath)
      return bffError(request, 404, '지원하지 않는 경로입니다.');

    await validateAdminRequest(
      new NextRequest(request.url, { headers: request.headers }),
      endpoint.operation,
      endpoint.serverPath,
      endpoint.operation.path,
    );

    const query = url.searchParams;

    if (path === '/campaigns') return Response.json(campaignCatalog());

    const tab =
      path === '/campaigns/push-opens'
        ? 'push'
        : path.split('/').at(-1) === 'analytics'
          ? 'trend'
          : path.includes('/conversion/funnels/')
            ? 'funnels'
            : path.split('/').at(-1)!;
    const campaign = campaignCatalog().items.find(
      (item) => item.campaign === query.get('campaign'),
    );
    const defaults = defaultPeriod(tab, campaign);

    if (path === '/campaigns/push-opens' && query.has('days')) {
      if (query.has('from') || query.has('to'))
        return bffError(request, 400, '기간 범위를 확인해 주세요.', 'days');

      defaults.to = kstToday();
      defaults.from = shiftDate(defaults.to, 1 - Number(query.get('days')));
    }

    const from = query.get('from') ?? defaults.from,
      to = query.get('to') ?? defaults.to;

    if (
      query.has('from') !== query.has('to') ||
      getRangeError({ from, to }) ||
      (Date.parse(to) - Date.parse(from)) / 86400000 >=
        tabLimits(tab).maxDays ||
      (tab === 'retention' && to > shiftDate(kstToday(), -1))
    )
      return bffError(request, 400, '기간 범위를 확인해 주세요.', 'from');

    query.set('from', from);
    query.set('to', to);

    const data = metricFixture(path, query);

    if (
      (process.env.ADMIN_ANALYTICS_FIXTURE_SCENARIO === 'unavailable' ||
        query.get('campaign') === 'FIXTURE_UNAVAILABLE') &&
      !(
        path === '/campaigns/push-opens' &&
        'asOf' in data &&
        data.asOf === null
      )
    )
      return Response.json(
        {
          status: 503,
          code: 'SERVICE_UNAVAILABLE',
          message: '분석 지표를 가져올 수 없습니다.',
          path: url.pathname,
        },
        { status: 503 },
      );

    return Response.json(data);
  } catch {
    return bffError(request, 400, '요청 조건을 확인해 주세요.');
  }
}
