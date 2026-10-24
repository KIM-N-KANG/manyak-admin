export type Notice = {
  noticeId: string;
  title: string;
  tag: string;
  body: string | null;
  notificationTitle: string | null;
  notificationBody: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  notifiedAt: string | null;
  createdBy: { memberId: string; nickname: string };
  createdAt: string;
  updatedAt: string;
};
export type NoticeListItem = Omit<
  Notice,
  'body' | 'notificationTitle' | 'notificationBody'
>;
export type NoticePublish = Notice & { notified: boolean };
