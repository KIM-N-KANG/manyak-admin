import { shiftDate } from '@/features/analytics/range';
import type {
  CampaignOpensResponse,
  NotificationOpenState,
  NotificationOpenValues,
} from '@/features/analytics/types';
import { kstToday } from '@/features/dashboard/date-range';

import { getCampaign } from './notifications';
import { kstDate } from './query';

/** 측정 상태와 플랫폼별 값을 계약의 열람 값으로 바꾼다. */
export function notificationOpenValues<S extends NotificationOpenState>(
  state: S,
  delivered: number,
  webPush: number | null = null,
  androidPush: number | null = null,
  webInbox: number | null = null,
  androidInbox: number | null = null,
): NotificationOpenValues & { openState: S } {
  const measured = state === 'MEASURED';
  const push = measured ? (webPush ?? 0) + (androidPush ?? 0) : null;

  return {
    openState: state,
    pushOpens: push,
    webPushOpens: measured ? webPush : null,
    androidPushOpens: measured ? androidPush : null,
    pushOpenRate: push !== null && delivered ? push / delivered : null,
    inboxOpens: measured ? (webInbox ?? 0) + (androidInbox ?? 0) : null,
    webInboxOpens: measured ? webInbox : null,
    androidInboxOpens: measured ? androidInbox : null,
  };
}

/** 캠페인의 현재 마지막 발송 상태와 기간을 따르는 열람 고정 데이터다. */
export function getCampaignOpens(id: string): CampaignOpensResponse {
  const campaign = getCampaign(id);
  const from = campaign.startedAt ? kstDate(campaign.startedAt) : null;
  const to = from ? [kstToday(), shiftDate(from, 365)].sort()[0] : null;
  const measuredFrom = '2026-10-21',
    androidMeasuredFrom = '2026-10-23';
  const state = !from
    ? 'PENDING'
    : from < measuredFrom
      ? 'BEFORE_MEASUREMENT'
      : !campaign.noticeId && !campaign.storyId
        ? 'NO_LINK'
        : 'MEASURED';
  const android = from !== null && from >= androidMeasuredFrom;

  return {
    campaignId: id,
    startedAt: campaign.startedAt,
    from,
    to,
    measuredFrom,
    androidMeasuredFrom,
    deliveredMembers: campaign.deliveredMembers,
    asOf: state === 'MEASURED' ? `${to}T05:10:00Z` : null,
    pendingDates:
      state === 'MEASURED' && from && to && from < shiftDate(to, -1)
        ? [shiftDate(to, -1)]
        : [],
    ...notificationOpenValues(
      state,
      campaign.deliveredMembers,
      61,
      android ? 23 : null,
      4,
      android ? 7 : null,
    ),
  };
}
