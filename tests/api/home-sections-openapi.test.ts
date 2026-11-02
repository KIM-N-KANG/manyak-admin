import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

import {
  Create5Body,
  List4Response,
  Update3Body,
} from '@/api/generated/zod/admin';
import { homeSectionRows } from '@/fixtures/home-sections';

import transform from '../../scripts/transform-admin-openapi.mjs';

const snapshot = () =>
  JSON.parse(readFileSync('docs/openapi/admin.json', 'utf8'));

it('실제 DTO 스냅샷을 보존하고 생성 입력에만 누락된 계약 제약을 보완한다', () => {
  const original = snapshot();
  const before = structuredClone(original);
  const result = transform(original);

  expect(original).toEqual(before);
  expect(original['x-source'].homeSections.revision).toBe(
    '43e309229bb7f65437819333fc597592b60d4f14',
  );
  expect(
    original.components.schemas.HomeSectionListResponse.required,
  ).toBeUndefined();
  expect(
    original.components.schemas.HomeSectionCreateRequest.properties.itemLimit
      .type,
  ).toContain('null');
  expect(result.components.schemas.HomeSectionListResponse.required).toEqual([
    'items',
  ]);
  expect(
    result.components.schemas.HomeSectionCreateRequest.properties.itemLimit
      .type,
  ).toEqual(['integer']);
  expect(
    result.paths['/api/v1/admin/home-sections'].get.responses['200'].content[
      'application/json'
    ].schema.$ref,
  ).toBe('#/components/schemas/HomeSectionListResponse');
  expect(result.components.schemas.AdminStoriesRequest).toEqual(
    original.components.schemas.AdminStoriesRequest,
  );
});

it('생성 응답은 필수 섹션 필드와 nullable 수동 정렬을 검증한다', () => {
  const items = structuredClone(homeSectionRows());

  expect(List4Response.safeParse({ items }).success).toBe(true);

  const { isActive: _active, ...incomplete } = items[0];

  expect(List4Response.safeParse({ items: [incomplete] }).success).toBe(false);
  expect(List4Response.safeParse({}).success).toBe(false);
});

it('선택 필드의 명시적 null과 배열 상한 및 공백 사유를 생성 요청 검증에서 거부한다', () => {
  const valid = {
    name: '홈 섹션',
    source: 'FILTER',
    sort: 'popular',
    reason: '운영 변경',
  };

  expect(Create5Body.safeParse(valid).success).toBe(true);

  for (const field of [
    'source',
    'storyIds',
    'genres',
    'originalOnly',
    'sort',
    'itemLimit',
    'isActive',
    'sortOrder',
  ]) {
    expect(
      Update3Body.safeParse({ reason: '운영 변경', [field]: null }).success,
    ).toBe(false);
  }

  expect(Create5Body.safeParse({ ...valid, reason: ' ' }).success).toBe(false);
  expect(
    Create5Body.safeParse({ ...valid, genres: Array(11).fill('로맨스') })
      .success,
  ).toBe(false);
  expect(
    Create5Body.safeParse({ ...valid, storyIds: ['invalid'] }).success,
  ).toBe(false);
});
