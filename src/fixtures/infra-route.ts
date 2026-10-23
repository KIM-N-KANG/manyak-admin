import { NextRequest } from 'next/server';

import { validateAdminRequest } from '@/api/admin-validation';
import { productionDataSourceError } from '@/api/data-source-guard';
import { adminOperations } from '@/api/generated/admin-operations';
import { getRangeError, kstToday } from '@/features/dashboard/date-range';

import {
  infraEmptyMetricsFixture,
  infraMetricsFixture,
  infraTablesFixture,
} from './infra';

export function infraRoute(path: 'metrics' | 'db-tables') {
  return async function GET(request: Request) {
    const configurationError = productionDataSourceError();

    if (configurationError) return configurationError;

    const query = new URL(request.url).searchParams;
    const serverPath = `/api/v1/admin/infra/${path}`;
    const operation = adminOperations.find(
      (entry) => entry.path === serverPath && entry.method === 'GET',
    )!;

    try {
      await validateAdminRequest(
        new NextRequest(request.url, { headers: request.headers }),
        operation,
        serverPath,
        operation.path,
      );

      if (path === 'db-tables')
        return Response.json(
          infraTablesFixture(Number(query.get('limit') ?? 20)),
        );

      const from = query.get('from') ?? kstToday(),
        to = query.get('to') ?? kstToday();

      if (
        query.has('from') !== query.has('to') ||
        getRangeError({ from, to }) ||
        (Date.parse(to) - Date.parse(from)) / 86400000 + 1 > 31
      )
        throw new Error('기간이 올바르지 않다.');

      if (process.env.ADMIN_INFRA_FIXTURE_SCENARIO === 'unavailable')
        return Response.json(
          { message: '인프라 지표를 가져올 수 없습니다.' },
          { status: 503 },
        );

      if (process.env.ADMIN_INFRA_FIXTURE_SCENARIO === 'empty')
        return Response.json(infraEmptyMetricsFixture(from, to));

      return Response.json(
        infraMetricsFixture(
          from,
          to,
          process.env.ADMIN_INFRA_FIXTURE_SCENARIO === 'complete',
        ),
      );
    } catch {
      return Response.json(
        { message: '요청 값이 올바르지 않습니다.' },
        { status: 400 },
      );
    }
  };
}
