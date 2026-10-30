import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { findAdminEndpoint } from '@/api/admin-endpoints';
import { DELETE,PUT } from '@/app/api/credits/promotions/[code]/route';
import { GET } from '@/app/api/credits/promotions/route';
import {
  kstToUtc,
  promotionFormSchema,
  promotionPeriod,
  promotionPrice,
  promotionRequest,
  promotionStatus,
  utcToKst,
} from '@/features/credits/promotions';
import {
  currentSidebarGroup,
  isMenuActive,
} from '@/features/navigation/sidebar-state';
import { promotionModels } from '@/fixtures/credit-promotions';

const original = structuredClone(promotionModels);
const base = 'https://admin.example/api/credits/promotions';
const form = {
  turnCost: '0',
  startsAt: '2026-10-31T10:00',
  endsAt: '2026-11-06T00:00',
  reason: '  할로윈 이벤트  ',
};

function mutate(
  method: 'PUT' | 'DELETE',
  body: unknown,
  code = 'LITE',
  origin = 'https://admin.example',
) {
  return (method === 'PUT' ? PUT : DELETE)(
    new Request(`${base}/${code}`, {
      method,
      headers: { Origin: origin },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ code }) },
  );
}

beforeEach(() => {
  vi.stubEnv('ADMIN_DATA_SOURCE', 'fixture');
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-30T08:00:00Z'));
  promotionModels.splice(
    0,
    promotionModels.length,
    ...structuredClone(original),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  promotionModels.splice(
    0,
    promotionModels.length,
    ...structuredClone(original),
  );
});

it('KST 입력과 UTC 변환은 날짜 경계를 보존한다', () => {
  expect(kstToUtc(form.startsAt)).toBe('2026-10-31T01:00:00Z');
  expect(kstToUtc(form.endsAt)).toBe('2026-11-05T15:00:00Z');
  expect(utcToKst('2026-11-05T15:00:00Z')).toBe(form.endsAt);

  for (const value of [
    '',
    '2026-02-30T10:00',
    '2026-10-31T25:00',
    '2026-10-31',
  ])
    expect(kstToUtc(value)).toBeNull();
});
it('요청 본문은 가격을 정수, 시각을 UTC, 사유를 공백 제거한 값으로 보낸다', () => {
  expect(promotionRequest(form)).toEqual({
    turnCost: 0,
    startsAt: '2026-10-31T01:00:00Z',
    endsAt: '2026-11-05T15:00:00Z',
    reason: '할로윈 이벤트',
  });
});
it.each([
  { turnCost: '-1' },
  { turnCost: '10001' },
  { turnCost: '0.5' },
  { turnCost: '' },
  { endsAt: form.startsAt },
  { endsAt: '2026-10-30T10:00' },
  { startsAt: '' },
  { endsAt: '' },
  { reason: '' },
  { reason: ' ' },
  { reason: 'x'.repeat(501) },
])('잘못된 폼 %j를 거절한다', (patch) => {
  expect(promotionFormSchema.safeParse({ ...form, ...patch }).success).toBe(
    false,
  );
});
it('가격 상한과 과거 시작을 허용한다', () => {
  expect(
    promotionFormSchema.safeParse({
      ...form,
      turnCost: '10000',
      startsAt: '2026-10-01T00:00',
    }).success,
  ).toBe(true);
});
it('예정, 진행 중, 종료와 없는 프로모션을 표시한다', () => {
  const promotion = original[0].promotion!;

  expect(promotionPrice(promotion)).toBe('0 (무료)');
  expect(promotionPrice({ ...promotion, turnCost: 10000 })).toBe('10,000');
  expect(promotionPeriod(promotion)).toBe(
    '2026-10-31 10:00 ~ 2026-11-06 00:00',
  );

  for (const [status, label] of [
    ['SCHEDULED', '예정'],
    ['ACTIVE', '진행 중'],
    ['ENDED', '종료'],
  ] as const)
    expect(promotionStatus({ ...promotion, status })).toBe(label);

  expect([
    promotionPrice(null),
    promotionPeriod(null),
    promotionStatus(null),
  ]).toEqual(['-', '-', '-']);
});
it('두 경로 모두 이프 메뉴와 관리 구역을 활성화한다', () => {
  for (const path of ['/credits/transactions', '/credits/promotions']) {
    expect(isMenuActive(path, '/credits/transactions')).toBe(true);
    expect(currentSidebarGroup(path)).toBe('manage');
  }
});
it('목록은 비활성 모델을 포함하며 설정과 해제가 재조회에 반영된다', async () => {
  const response = await GET(new Request(base));
  const list = await response.json();

  expect(list.items[0]).toMatchObject({
    code: 'LITE',
    promotion: { turnCost: 0, status: 'SCHEDULED' },
  });
  expect(list.items[1]).toMatchObject({ code: 'AURORA', promotion: null });
  expect(list.items.some((item: { isActive: boolean }) => !item.isActive)).toBe(
    true,
  );
  expect((await mutate('PUT', promotionRequest(form))).status).toBe(200);
  expect(
    (await GET(new Request(base)).then((r) => r.json())).items[0].promotion
      .turnCost,
  ).toBe(0);
  expect((await mutate('DELETE', { reason: '이벤트 종료' })).status).toBe(200);
  expect(
    (await GET(new Request(base)).then((r) => r.json())).items[0].promotion,
  ).toBeNull();
  expect((await mutate('DELETE', { reason: '이벤트 종료' })).status).toBe(404);
});
it('시작은 포함하고 종료는 제외한다', async () => {
  vi.setSystemTime(new Date('2026-10-31T01:00:00Z'));
  expect(
    (await GET(new Request(base)).then((r) => r.json())).items[0].promotion
      .status,
  ).toBe('ACTIVE');
  vi.setSystemTime(new Date('2026-11-05T15:00:00Z'));
  expect(
    (await GET(new Request(base)).then((r) => r.json())).items[0].promotion
      .status,
  ).toBe('ENDED');
});
it.each([
  {},
  { turnCost: -1 },
  { turnCost: 10001 },
  { turnCost: 0.5 },
  { reason: '' },
  { reason: 'x'.repeat(501) },
  { endsAt: '2026-10-31T01:00:00Z' },
  { endsAt: '2026-10-01T00:00:00Z' },
  { startsAt: 'invalid' },
  { extra: true },
])('fixture가 잘못된 설정 %j를 400으로 거절한다', async (patch) => {
  const body = Object.keys(patch).length
    ? { ...promotionRequest(form), ...patch }
    : {};

  expect((await mutate('PUT', body)).status).toBe(400);
});
it('해제 본문 사유와 없는 모델을 검증한다', async () => {
  for (const body of [
    {},
    { reason: ' ' },
    { reason: 'x'.repeat(501) },
    { reason: '종료', turnCost: 0 },
  ])
    expect((await mutate('DELETE', body)).status).toBe(400);

  expect((await mutate('PUT', promotionRequest(form), 'MISSING')).status).toBe(
    404,
  );
});
it('외부 출처와 운영 fixture 및 미연결 server 모드를 차단한다', async () => {
  expect(
    (await mutate('DELETE', { reason: '종료' }, 'LITE', 'https://evil.example'))
      .status,
  ).toBe(403);
  vi.stubEnv('VERCEL_ENV', 'production');
  expect((await GET(new Request(base))).status).toBe(503);
  vi.stubEnv('ADMIN_DATA_SOURCE', 'server');
  expect((await mutate('PUT', promotionRequest(form))).status).toBe(503);
});
it('OpenAPI 연결 전에도 세 BFF의 서버 경로를 등록하고 전달을 차단한다', () => {
  expect(findAdminEndpoint('/credits/promotions', 'GET')).toMatchObject({
    serverPath: '/api/v1/admin/chat-models',
    implemented: false,
  });

  for (const method of ['PUT', 'DELETE'])
    expect(findAdminEndpoint('/credits/promotions/LITE', method)).toMatchObject(
      {
        serverPath: '/api/v1/admin/chat-models/LITE/promotion',
        implemented: false,
      },
    );
});
