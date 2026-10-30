import { isMarketingNoticeTag } from '@/features/notices/tags';
import type {
  Campaign,
  CampaignStatus,
  DeliveryRow,
  TargetCount,
  Template,
  TemplateKey,
} from '@/features/notifications/types';
import { notificationTypes } from '@/features/notifications/types';
import { stories } from '@/fixtures/entities';
import {
  checkFixtureId,
  FixtureError,
  readReason,
  requireFixture,
  textField,
} from '@/fixtures/management-bff';
import { getNotice, markNoticeNotified } from '@/fixtures/notices';
import { validId } from '@/fixtures/query';
import { kstDate, validateOptions, validatePeriod } from '@/fixtures/query';

const shared = globalThis as typeof globalThis & {
  manyakNotificationFixtures?: {
    campaigns: Map<string, Campaign>;
    overrides: Partial<Record<TemplateKey, Template['overrides']>>;
  };
};

function store() {
  return (shared.manyakNotificationFixtures ??= {
    campaigns: new Map(
      Array.from({ length: 31 }, (_, i) => {
        const status: CampaignStatus = (
          ['SCHEDULED', 'SENDING', 'SENT', 'CANCELED', 'FAILED'] as const
        )[i % 5];
        const id = `c1000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;

        return [
          id,
          {
            campaignId: id,
            kind: i % 3 === 0 ? 'SERVICE' : 'MARKETING',
            title:
              i % 3 === 0 ? '서비스 점검 안내' : `주말 이프 이벤트 ${i + 1}`,
            body: '새로운 이야기를 만나 보세요.',
            scheduledAt: new Date(
              Date.UTC(2026, 9, 24) - i * 86400000,
            ).toISOString(),
            status,
            failureReason:
              status === 'FAILED' && i % 2 === 0
                ? 'NOTICE_NOT_PUBLISHED'
                : null,
            noticeId:
              i % 3 === 0 || (status === 'FAILED' && i % 2 === 0)
                ? 'b1000000-0000-4000-8000-000000000001'
                : null,
            storyId: null,
            targetCount: status === 'SCHEDULED' ? null : 412,
            sentCount: status === 'SCHEDULED' ? null : 400,
            deliveredMembers: status === 'SENT' ? 380 : 0,
            deliveredDevices: status === 'SENT' ? 455 : 0,
            failedDevices: status === 'SENT' ? 9 : 0,
            startedAt:
              status === 'SCHEDULED' || status === 'CANCELED'
                ? null
                : '2026-10-21T01:00:00Z',
            finishedAt:
              status === 'SENT' || status === 'FAILED'
                ? '2026-10-21T01:00:15Z'
                : null,
            createdAt: new Date(
              Date.UTC(2026, 9, 21) - i * 3600000,
            ).toISOString(),
          },
        ];
      }),
    ),
    overrides: {},
  });
}

export function listCampaigns() {
  return structuredClone([...store().campaigns.values()]);
}
export function getCampaign(id: string) {
  checkFixtureId(id);

  return structuredClone(requireFixture(store().campaigns.get(id)));
}
export function futureTime(value: unknown, label: string) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    Date.parse(value) < Date.now()
  )
    throw new Error(`${label}은 현재 이후의 올바른 시각이어야 합니다.`);

  return new Date(value).toISOString();
}
export function createCampaign(body: Record<string, unknown>) {
  if (body.noticeId != null && body.storyId != null)
    throw new Error('스토리와 공지를 함께 선택할 수 없습니다.');

  let notice;

  if (body.noticeId != null) {
    if (typeof body.noticeId !== 'string' || !validId(body.noticeId))
      throw new Error('공지 식별자가 올바르지 않습니다.');

    try {
      notice = getNotice(body.noticeId);
    } catch {
      throw new Error('게시된 공지만 이동 대상으로 지정할 수 있습니다.');
    }

    if (notice.status !== 'PUBLISHED')
      throw new Error('게시된 공지만 이동 대상으로 지정할 수 있습니다.');
  }

  if (
    body.storyId != null &&
    (typeof body.storyId !== 'string' ||
      !validId(body.storyId) ||
      !stories.some(
        (story) =>
          story.storyId === body.storyId &&
          story.visibility === 'PUBLIC' &&
          !story.deletedAt,
      ))
  )
    throw new Error(
      '이동 대상은 발행 상태인 공개 스토리만 선택할 수 있습니다.',
    );

  readReason(body);

  const now = new Date().toISOString();
  const item: Campaign = {
    campaignId: crypto.randomUUID(),
    kind: notice && !isMarketingNoticeTag(notice.tag) ? 'SERVICE' : 'MARKETING',
    title: textField(body, 'title', 100),
    body: textField(body, 'body', 300),
    scheduledAt:
      body.scheduledAt == null
        ? now
        : futureTime(body.scheduledAt, '예약 시각'),
    status: 'SCHEDULED',
    failureReason: null,
    noticeId: notice?.noticeId ?? null,
    storyId: null,
    targetCount: null,
    sentCount: null,
    deliveredMembers: 0,
    deliveredDevices: 0,
    failedDevices: 0,
    startedAt: null,
    finishedAt: null,
    createdAt: now,
  };

  item.storyId = typeof body.storyId === 'string' ? body.storyId : null;

  if (notice) markNoticeNotified(notice.noticeId, now);

  store().campaigns.set(item.campaignId, item);

  return structuredClone(item);
}
export function changeCampaign(
  id: string,
  action: 'cancel' | 'retry',
  body: Record<string, unknown>,
) {
  readReason(body);

  const item = getCampaign(id);

  if (item.status !== (action === 'cancel' ? 'SCHEDULED' : 'FAILED'))
    throw new FixtureError(409, '현재 상태에서는 처리할 수 없습니다.');

  item.status = action === 'cancel' ? 'CANCELED' : 'SCHEDULED';

  if (action === 'retry') {
    item.failureReason = null;
    item.scheduledAt = new Date().toISOString();
    item.startedAt = null;
    item.finishedAt = null;
  }

  store().campaigns.set(id, item);

  return structuredClone(item);
}
export function targetCount(kind: string | null): TargetCount {
  if (kind !== 'SERVICE' && kind !== 'MARKETING')
    throw new Error('종류를 선택하세요.');

  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  );

  return {
    kind,
    targetCount: kind === 'SERVICE' ? 1180 : 412,
    nightEligibleCount: kind === 'SERVICE' ? null : 180,
    nightNow: hour >= 21 || hour < 8,
    asOf: now.toISOString(),
  };
}

const defaultCopy = {
  attendance_reminder: {
    title: '이프 250이 도착했어요',
    body: '출석하고 받아 가세요. 오늘은 어떤 스토리를 시작해 볼까요?',
  },
  credit_expiry_reminder: {
    title: '이프 만료 예정 안내',
    body: '곧 만료되는 이프가 있어요',
  },
};

function checkTemplate(key: string): asserts key is TemplateKey {
  if (!Object.hasOwn(defaultCopy, key))
    throw new FixtureError(404, '문구 템플릿을 찾을 수 없습니다.');
}

export function getTemplate(key: string): Template {
  checkTemplate(key);

  const now = Date.now();
  const overrides = (store().overrides[key] ?? [])
    .map((i) => ({
      ...i,
      active:
        Date.parse(i.effectiveFrom) <= now &&
        (!i.effectiveUntil || now < Date.parse(i.effectiveUntil)),
    }))
    .toSorted((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const active = overrides.find((i) => i.active);

  return {
    templateKey: key,
    effective: active
      ? { title: active.title, body: active.body, isDefault: false }
      : { ...defaultCopy[key], isDefault: true },
    overrides,
  };
}
export function updateTemplate(key: string, body: Record<string, unknown>) {
  checkTemplate(key);
  readReason(body);

  const effectiveFrom =
    body.effectiveFrom == null
      ? new Date().toISOString()
      : futureTime(body.effectiveFrom, '시작 시각');
  const effectiveUntil =
    body.effectiveUntil == null
      ? null
      : futureTime(body.effectiveUntil, '종료 시각');

  if (effectiveUntil && effectiveUntil <= effectiveFrom)
    throw new Error('종료 시각은 시작 시각 이후여야 합니다.');

  (store().overrides[key] ??= []).unshift({
    title: textField(body, 'title', 100),
    body: textField(body, 'body', 300),
    effectiveFrom,
    effectiveUntil,
    active: false,
  });

  return getTemplate(key);
}
export function resetTemplate(key: string, body: Record<string, unknown>) {
  checkTemplate(key);
  readReason(body);

  const now = new Date().toISOString();

  (store().overrides[key] ?? []).forEach((i) => {
    if (!i.effectiveUntil || i.effectiveUntil > now)
      i.effectiveUntil = i.effectiveFrom > now ? i.effectiveFrom : now;
  });

  return getTemplate(key);
}
export function deliveryStats(query: URLSearchParams) {
  const to = query.get('to') ?? kstDate(new Date().toISOString());
  const from =
    query.get('from') ??
    new Date(Date.parse(to) - 6 * 86400000).toISOString().slice(0, 10);
  const q = new URLSearchParams({ from, to });

  validatePeriod(q);
  validateOptions(query, {
    type: [...notificationTypes],
    kind: ['SERVICE', 'MARKETING'],
  });

  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;

  if (days > 366) throw new Error('통계 기간은 최대 366일입니다.');

  const items: DeliveryRow[] = [];

  for (let day = 0; day < days; day++) {
    const date = new Date(Date.parse(to) - day * 86400000)
      .toISOString()
      .slice(0, 10);

    notificationTypes.forEach((type, i) => {
      const kind =
        type === 'PROMOTION' || type === 'ATTENDANCE_REMINDER'
          ? 'MARKETING'
          : 'SERVICE';

      if (
        (query.get('type') && type !== query.get('type')) ||
        (query.get('kind') && kind !== query.get('kind'))
      )
        return;

      items.push({
        date,
        type,
        kind,
        requested: 100 + i * 70 + (day % 7),
        deliveredMembers: 90 + i * 65,
        deliveredDevices: 110 + i * 75,
        failedDevices: 3 + i,
      });
    });
  }

  return {
    from,
    to,
    items: items.toSorted(
      (a, b) => b.date.localeCompare(a.date) || a.type.localeCompare(b.type),
    ),
  };
}
