import { NextRequest } from 'next/server';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import { isSameOrigin } from '@/api/admin-upstream';
import { validateAdminRequest } from '@/api/admin-validation';
import { bffError } from '@/api/bff-error';
import { productionDataSourceError } from '@/api/data-source-guard';
import { normalizeSearch } from '@/features/shared/search';
import { canTakeDown } from '@/features/stories/takedown';
import { deletedStories, stories } from '@/fixtures/entities';
import { inPeriod, paginate, validatePeriod } from '@/fixtures/query';

import { moderationRows } from './moderation';

export async function moderationRoute(request: Request) {
  const guard = productionDataSourceError();

  if (guard) return guard;

  if (request.method !== 'GET' && !isSameOrigin(request))
    return Response.json(
      { message: '허용하지 않는 출처입니다.' },
      { status: 403 },
    );

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');
  const endpoint = findAdminEndpoint(path, request.method);

  try {
    if (!endpoint?.operation || !endpoint.serverPath)
      return bffError(request, 404, '지원하지 않는 경로입니다.');

    const validationUrl = new URL(request.url);

    if (path === '/moderation/submissions') {
      for (const [key, value] of Object.entries({
        page: '1',
        size: '20',
        order: 'desc',
      })) {
        if (!validationUrl.searchParams.has(key))
          validationUrl.searchParams.set(key, value);
      }
    }

    const body = await validateAdminRequest(
      new NextRequest(validationUrl, {
        method: request.method,
        headers: request.headers,
        ...(request.method === 'GET' ? {} : { body: await request.text() }),
      }),
      endpoint.operation,
      endpoint.serverPath,
      endpoint.operation.path,
    );

    if (path === '/moderation/submissions') {
      const q = url.searchParams;

      validatePeriod(q);

      if (
        q.has('sort') &&
        !['createdAt', 'decidedAt', 'heldAt'].includes(q.get('sort')!)
      )
        throw new Error('정렬 열이 올바르지 않다.');

      const search = q.has('q')
        ? normalizeSearch(q.get('q')!).toLocaleLowerCase()
        : null;

      if (search === '') throw new Error('검색어가 비어 있다.');

      const all = moderationRows().filter(
        (row) =>
          (!q.get('status') || row.status === q.get('status')) &&
          (!q.get('memberId') || row.owner.memberId === q.get('memberId')) &&
          (!q.get('storyId') || row.story.storyId === q.get('storyId')) &&
          inPeriod(row.createdAt, q) &&
          (search === null ||
            row.submissionId.toLowerCase() === search ||
            row.story.title.toLocaleLowerCase().includes(search)),
      );
      const key = (q.get('sort') ?? 'createdAt') as
        | 'createdAt'
        | 'decidedAt'
        | 'heldAt';
      const sign = q.get('order') === 'asc' ? 1 : -1;
      const sorted = all.toSorted((a, b) => {
        const left = a[key],
          right = b[key];

        if (left === null || right === null)
          return left === right
            ? b.submissionId.localeCompare(a.submissionId)
            : left === null
              ? 1
              : -1;

        return (
          sign * left.localeCompare(right) ||
          b.submissionId.localeCompare(a.submissionId)
        );
      });
      const result = paginate(sorted, q);

      return Response.json({
        ...result,
        items: result.items.map(
          ({
            fields: _fields,
            issues: _issues,
            imageResults: _images,
            retryCount: _retry,
            updatedAt: _updated,
            ...summary
          }) => summary,
        ),
      });
    }

    const id = decodeURIComponent(path.split('/')[3]);

    if (path.startsWith('/moderation/stories/')) {
      const story = [...stories, ...deletedStories].find(
        (item) => item.storyId === id,
      );

      if (!story) return bffError(request, 404, '스토리를 찾을 수 없습니다.');

      if (!canTakeDown(story))
        return bffError(
          request,
          409,
          '공개 중단할 수 없는 상태의 스토리입니다.',
        );

      const input = JSON.parse(body!);

      story.visibility = 'PRIVATE';
      story.takenDownAt = new Date().toISOString();
      story.takedownReason = input.reasonCode;
      story.takedownReasonDetail = input.reasonDetail ?? null;

      return Response.json({
        storyId: story.storyId,
        visibility: story.visibility,
        takenDownAt: story.takenDownAt,
        takedownReason: story.takedownReason,
        takedownReasonDetail: story.takedownReasonDetail,
      });
    }

    const row = moderationRows().find((row) => row.submissionId === id);

    if (!row) return bffError(request, 404, '제출본을 찾을 수 없습니다.');

    if (request.method === 'POST') {
      if (row.status !== 'HELD')
        return Response.json(
          {
            status: 409,
            code: 'CONFLICT',
            message: '보류 중인 제출본이 아닙니다.',
          },
          { status: 409 },
        );

      if (!body) throw new Error('본문이 필요하다.');

      const reason = JSON.parse(body).reason;

      if (typeof reason !== 'string' || !reason.trim() || reason.length > 500)
        throw new Error('사유가 올바르지 않다.');

      row.status = 'PENDING';
      row.heldAt = null;
      row.holdReason = null;
      row.errorCode = null;
      row.retryCount = 0;
      row.updatedAt = new Date().toISOString();

      return Response.json({
        submissionId: id,
        status: row.status,
        attempt: row.attempt,
        releasedAt: row.updatedAt,
      });
    }

    return Response.json(row);
  } catch {
    return bffError(request, 400, '요청 조건을 확인해 주세요.');
  }
}
