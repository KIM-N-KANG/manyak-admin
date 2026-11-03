import { NextRequest } from 'next/server';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import {
  failure,
  forwardAdminRequest,
  isSameOrigin,
  isServerMode,
} from '@/api/admin-upstream';
import { validateAdminRequest } from '@/api/admin-validation';
import { bffError } from '@/api/bff-error';
import { productionDataSourceError } from '@/api/data-source-guard';
import type { HomeSection } from '@/features/home-sections/form';
import { stories } from '@/fixtures/entities';
import { homeSectionRows } from '@/fixtures/home-sections';
import { originalGenres } from '@/fixtures/original-genres';

/** 생성된 연산 검증 뒤 서버 전달 또는 비운영 고정 데이터 변경을 수행한다. */
export async function homeSectionsRoute(request: Request) {
  const guard = productionDataSourceError();

  if (guard) return guard;

  if (request.method !== 'GET' && !isSameOrigin(request))
    return failure(403, '허용하지 않는 출처입니다.');

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');
  const endpoint = findAdminEndpoint(path, request.method);

  if (!endpoint?.operation || !endpoint.serverPath)
    return bffError(request, 404, '지원하지 않는 경로입니다.');

  try {
    const next = new NextRequest(request.url, {
      method: request.method,
      headers: request.headers,
      ...(request.method === 'GET' ? {} : { body: await request.text() }),
    });
    const body = await validateAdminRequest(
      next,
      endpoint.operation,
      endpoint.serverPath,
      endpoint.operation.path,
    );

    if (isServerMode())
      return forwardAdminRequest(next, endpoint.serverPath + url.search, body);

    const rows = homeSectionRows();
    const id = path.split('/')[2];

    if (request.method === 'GET')
      return Response.json({
        items: rows
          .toSorted(
            (a, b) =>
              a.sortOrder - b.sortOrder ||
              a.createdAt.localeCompare(b.createdAt) ||
              a.id.localeCompare(b.id),
          )
          .map((row) => ({
            ...row,
            stories: row.stories.map((entry) => {
              const story = stories.find(
                (story) => story.storyId === entry.storyId,
              );

              return {
                ...entry,
                isListed: Boolean(
                  story &&
                  story.visibility === 'PUBLIC' &&
                  !story.deletedAt &&
                  !story.takenDownAt,
                ),
              };
            }),
          })),
      });

    const input = JSON.parse(body!) as Record<string, unknown>;
    const existing = rows.find((row) => row.id === id);

    if (request.method !== 'POST' && !existing)
      return bffError(request, 404, '홈 섹션을 찾을 수 없습니다.');

    if (request.method === 'DELETE') {
      rows.splice(rows.indexOf(existing!), 1);

      return new Response(null, { status: 204 });
    }

    const source = input.source ?? existing?.source;

    if (source === 'MANUAL') {
      if (['genres', 'originalOnly', 'sort'].some((key) => key in input))
        return bffError(request, 400, '출처와 맞지 않는 필드입니다.');

      if (
        input.storyIds === undefined &&
        (!existing || source !== existing.source)
      )
        return bffError(request, 400, '스토리를 선택해 주세요.', 'storyIds');

      if (
        Array.isArray(input.storyIds) &&
        (new Set(input.storyIds).size !== input.storyIds.length ||
          input.storyIds.some(
            (id) =>
              !stories.some(
                (story) => story.storyId === id && !story.deletedAt,
              ),
          ))
      )
        return bffError(
          request,
          400,
          '스토리 식별자가 올바르지 않습니다.',
          'storyIds',
        );
    } else {
      if ('storyIds' in input)
        return bffError(
          request,
          400,
          '출처와 맞지 않는 필드입니다.',
          'storyIds',
        );

      if (!input.sort && (!existing || source !== existing.source))
        return bffError(request, 400, '정렬을 선택해 주세요.', 'sort');

      if (Array.isArray(input.genres)) {
        const details = input.genres.flatMap((genre, index) =>
          originalGenres.includes(genre as string)
            ? []
            : [
                {
                  field: `genres[${index}]`,
                  message: '제공하지 않는 장르입니다.',
                },
              ],
        );

        if (details.length)
          return Response.json(
            {
              status: 400,
              code: 'INVALID_GENRE',
              message: '장르를 확인해 주세요.',
              details,
            },
            { status: 400 },
          );
      }
    }

    const date = new Date().toISOString();
    const row: HomeSection = existing
      ? structuredClone(existing)
      : {
          id: crypto.randomUUID(),
          name: '',
          source: 'FILTER',
          stories: [],
          genres: [],
          originalOnly: false,
          sort: 'popular',
          itemLimit: 20,
          isActive: true,
          sortOrder: Math.max(0, ...rows.map((row) => row.sortOrder)) + 1,
          createdAt: date,
          updatedAt: date,
        };

    if (source !== row.source)
      Object.assign(row, {
        stories: [],
        genres: [],
        originalOnly: false,
        sort: null,
      });

    const { reason: _reason, storyIds, ...values } = input;

    Object.assign(row, values, { updatedAt: date });
    row.name = row.name.trim();

    if (source === 'MANUAL') {
      row.sort = null;

      if (Array.isArray(storyIds))
        row.stories = storyIds.map((id) => {
          const story = stories.find((story) => story.storyId === id)!;

          return {
            storyId: story.storyId,
            title: story.title,
            isListed:
              story.visibility === 'PUBLIC' &&
              !story.deletedAt &&
              !story.takenDownAt,
          };
        });
    }

    if (existing) rows[rows.indexOf(existing)] = row;
    else rows.push(row);

    return Response.json(row, {
      status: request.method === 'POST' ? 201 : 200,
    });
  } catch {
    return bffError(request, 400, '요청 조건을 확인해 주세요.');
  }
}
