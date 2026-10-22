import type { Notice, NoticePublish } from '@/features/notices/types';
import {
  checkFixtureId,
  FixtureError,
  readReason,
  requireFixture,
  textField,
} from '@/fixtures/management-bff';
import { createNoticeCampaign } from '@/fixtures/notifications';

const shared = globalThis as typeof globalThis & {
  manyakNotices?: Map<string, Notice>;
};

function records() {
  return (shared.manyakNotices ??= new Map(
    Array.from({ length: 27 }, (_, i) => {
      const id = `b1000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;

      return [
        id,
        {
          noticeId: id,
          title:
            [
              '10월 서비스 점검 안내',
              '할로윈 이벤트 안내',
              '이프 충전 상품 변경 안내',
            ][i % 3] + (i > 2 ? ` ${i + 1}` : ''),
          body: '마냑 서비스 이용 안내입니다.\n자세한 내용을 확인해 주세요.',
          status: i % 3 === 1 ? 'DRAFT' : 'PUBLISHED',
          publishedAt: i % 3 === 1 ? null : '2026-10-21T02:00:00Z',
          notifiedAt: i % 3 === 0 ? '2026-10-21T02:00:00Z' : null,
          createdBy: {
            memberId: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
            nickname: '고요한 서고',
          },
          createdAt: new Date(
            Date.UTC(2026, 9, 21) - i * 86400000,
          ).toISOString(),
          updatedAt: '2026-10-21T02:00:00Z',
        },
      ];
    }),
  ));
}

export function listNotices() {
  return [...records().values()].map(({ body, ...item }) => {
    void body;

    return structuredClone(item);
  });
}
export function getNotice(id: string) {
  checkFixtureId(id);

  return structuredClone(requireFixture(records().get(id)));
}
export function saveNotice(body: Record<string, unknown>, id?: string) {
  readReason(body);

  const previous = id ? getNotice(id) : undefined;
  const title =
    body.title == null && previous
      ? previous.title
      : textField(body, 'title', 100);
  const content =
    body.body == null && previous
      ? previous.body
      : textField(body, 'body', 5000);

  if (previous && body.title == null && body.body == null)
    throw new Error('제목이나 본문을 입력하세요.');

  const now = new Date().toISOString();
  const item: Notice = {
    noticeId: id ?? crypto.randomUUID(),
    title,
    body: content,
    status: previous?.status ?? 'DRAFT',
    publishedAt: previous?.publishedAt ?? null,
    notifiedAt: previous?.notifiedAt ?? null,
    createdBy: previous?.createdBy ?? {
      memberId: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
      nickname: '고요한 서고',
    },
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };

  records().set(item.noticeId, item);

  return structuredClone(item);
}
export function publishNotice(
  id: string,
  body: Record<string, unknown>,
): NoticePublish {
  readReason(body);

  const item = getNotice(id);

  if (
    typeof body.notify !== 'boolean' ||
    (body.notify &&
      !['SERVICE', 'MARKETING'].includes(String(body.notificationKind))) ||
    (body.notificationKind != null &&
      !['SERVICE', 'MARKETING'].includes(String(body.notificationKind)))
  )
    throw new Error('알림 여부와 종류를 확인하세요.');

  if (item.status === 'PUBLISHED')
    throw new FixtureError(409, '이미 게시된 공지입니다.');

  const notified = body.notify && !item.notifiedAt;

  item.status = 'PUBLISHED';
  item.publishedAt = new Date().toISOString();
  item.updatedAt = item.publishedAt;

  if (notified) {
    item.notifiedAt = item.publishedAt;
    createNoticeCampaign(
      id,
      item.title,
      item.body,
      body.notificationKind as 'SERVICE' | 'MARKETING',
    );
  }

  records().set(id, item);

  return { ...item, notified };
}
export function unpublishNotice(id: string, body: Record<string, unknown>) {
  readReason(body);

  const item = getNotice(id);

  if (item.status !== 'PUBLISHED')
    throw new FixtureError(409, '게시되지 않은 공지입니다.');

  item.status = 'DRAFT';
  item.updatedAt = new Date().toISOString();
  records().set(id, item);

  return structuredClone(item);
}
export function deleteNotice(id: string, body: Record<string, unknown>) {
  readReason(body);

  const item = getNotice(id);

  if (item.status !== 'DRAFT' || item.notifiedAt)
    throw new FixtureError(409, '알림 이력이 없는 초안만 삭제할 수 있습니다.');

  records().delete(id);
}
