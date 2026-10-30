import { metricNumber, percent } from './config';
import type { NotificationOpenValues } from './types';

export const notificationOpenStates = {
  BEFORE_MEASUREMENT: '측정 시작 전',
  NO_LINK: '측정 불가',
  PENDING: '발송 기록 없음',
} as const;
export const notificationOpenPartial =
  '열람 수는 준비된 날짜만 합산했습니다. 열람률은 일부 날짜의 열람 수를 전체 도달 회원 수로 나눈 값입니다.';

/** 서버 합계와 플랫폼별 값을 그대로 표시한다. */
export function NotificationOpenCount({
  values,
  channel,
}: {
  values: NotificationOpenValues;
  channel: 'push' | 'inbox';
}) {
  if (values.openState !== 'MEASURED')
    return notificationOpenStates[values.openState];

  const total = channel === 'push' ? values.pushOpens : values.inboxOpens;
  const web = channel === 'push' ? values.webPushOpens : values.webInboxOpens;
  const android =
    channel === 'push' ? values.androidPushOpens : values.androidInboxOpens;
  const platformValue = (value: number | null) =>
    value == null ? '측정 시작 전' : metricNumber(value, '명');

  return (
    <>
      <div>{total == null ? '계산할 수 없음' : metricNumber(total, '명')}</div>
      <div className="mt-1 text-xs font-normal text-muted-foreground">
        웹 {platformValue(web)}, 앱 {platformValue(android)}
      </div>
    </>
  );
}
export function notificationOpenRate(values: NotificationOpenValues) {
  return values.openState === 'MEASURED'
    ? percent(values.pushOpenRate)
    : notificationOpenStates[values.openState];
}
