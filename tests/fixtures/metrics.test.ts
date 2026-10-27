import { describe, expect, it } from 'vitest';

import type {
  ChatOptionResponse,
  QualityResponse,
  SessionResponse,
  TurnReachResponse,
} from '@/features/analytics/types';
import { metricFixture } from '@/fixtures/metrics';

const paths = [
  '/conversion/turn-reach',
  '/quality/chat-options',
  '/users/sessions',
  '/quality/client',
];

/** 응답 안의 숫자를 모두 모은다. */
function numbers(value: unknown): number[] {
  if (typeof value === 'number') return [value];

  if (value && typeof value === 'object')
    return Object.values(value).flatMap(numbers);

  return [];
}

describe.each(['all', 'guest', 'member'])('대상 %s 고정 데이터', (segment) => {
  const fixture = (path: string) =>
    metricFixture(
      path,
      new URLSearchParams(`from=2026-10-17&to=2026-10-23&segment=${segment}`),
    );

  it.each(paths)('%s는 대상을 돌려주고 NaN 없는 숫자만 담는다', (path) => {
    const data = fixture(path) as { segment?: string };
    const values = numbers(data);

    expect(data.segment).toBe(segment);
    expect(values.length).toBeGreaterThan(0);
    expect(values.every(Number.isFinite)).toBe(true);
    // JSON으로 보내도 숫자가 null로 바뀌지 않는다.
    expect(numbers(JSON.parse(JSON.stringify(data)))).toEqual(values);
  });

  it('플랫폼별 값은 선을 그릴 수 있는 채팅 수와 클릭 수, 세션 길이를 담는다', () => {
    const reach = fixture('/conversion/turn-reach') as TurnReachResponse;
    const options = fixture('/quality/chat-options') as ChatOptionResponse;
    const sessions = fixture('/users/sessions') as SessionResponse;
    const client = fixture('/quality/client') as QualityResponse;

    expect(
      reach
        .platforms!.filter((item) => item.platform !== 'unknown')
        .every((item) => item.chats > 0),
    ).toBe(true);
    expect(options.daily.some((day) => (day.chatStarts?.all ?? 0) > 0)).toBe(
      true,
    );
    expect(sessions.daily[0].averageSessionSeconds.all).toBeGreaterThan(0);
    expect(client.daily.length).toBeGreaterThan(0);
  });
});
