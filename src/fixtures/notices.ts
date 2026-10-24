import { isMarketingNoticeTag, noticeTags } from '@/features/notices/tags';
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
  return (shared.manyakNotices ??= new Map<string, Notice>(
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
          tag: noticeTags[i % noticeTags.length].value,
          body: '마냑 서비스 이용 안내입니다.\n자세한 내용을 확인해 주세요.',
          notificationTitle: i < 2 ? null : '마냑의 새로운 소식',
          notificationBody: i < 2 ? null : '새로운 운영 소식을 확인해 주세요.',
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
  return [...records().values()].map(
    ({ body, notificationTitle, notificationBody, ...item }) => {
      void body;
      void notificationTitle;
      void notificationBody;

      return structuredClone(item);
    },
  );
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

  const tag = body.tag == null && previous ? previous.tag : body.tag;

  if (!noticeTags.some((option) => option.value === tag))
    throw new Error('태그를 선택해 주세요.');

  const titleChanged = body.notificationTitle != null;
  const bodyChanged = body.notificationBody != null;
  const notificationTitle =
    titleChanged || !previous
      ? textField(body, 'notificationTitle', 100)
      : previous.notificationTitle;
  const notificationBody =
    bodyChanged || !previous
      ? textField(body, 'notificationBody', 300)
      : previous.notificationBody;

  if (previous?.notifiedAt && (titleChanged || bodyChanged))
    throw new FixtureError(
      409,
      '이미 알림을 요청한 공지라 알림 문구를 바꿀 수 없습니다.',
    );

  if (
    previous &&
    !previous.notifiedAt &&
    (titleChanged || bodyChanged) &&
    (notificationTitle === null || notificationBody === null)
  )
    throw new Error('알림 제목과 본문을 함께 입력해 주세요.');

  if (
    previous &&
    body.title == null &&
    body.body == null &&
    body.tag == null &&
    !titleChanged &&
    !bodyChanged
  )
    throw new Error('변경할 내용을 입력해 주세요.');

  const now = new Date().toISOString();
  const item: Notice = {
    noticeId: id ?? crypto.randomUUID(),
    title,
    tag: String(tag),
    body: content,
    notificationTitle,
    notificationBody,
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

  if (item.status === 'PUBLISHED')
    throw new FixtureError(409, '이미 게시된 공지입니다.');

  const notified = !item.notifiedAt;

  item.status = 'PUBLISHED';
  item.publishedAt = new Date().toISOString();
  item.updatedAt = item.publishedAt;

  if (notified) {
    if (item.notificationTitle === null || item.notificationBody === null)
      throw new FixtureError(
        409,
        '알림 제목과 본문을 입력한 뒤 게시해 주세요.',
      );

    item.notifiedAt = item.publishedAt;
    createNoticeCampaign(
      id,
      item.notificationTitle,
      item.notificationBody,
      isMarketingNoticeTag(item.tag) ? 'MARKETING' : 'SERVICE',
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
