import { expect, it } from 'vitest';

import { wrapFunnelLabel } from '@/features/analytics/funnel-label';

it('띄어쓰기에서 균형 잡힌 두 줄로 나눈다', () => {
  expect(wrapFunnelLabel('턴 1 채팅 메시지 전송')).toEqual([
    '턴 1 채팅',
    '메시지 전송',
  ]);
  expect(wrapFunnelLabel('시작')).toEqual(['시작']);
});
it('두 줄을 넘어가면 단어를 자르지 않고 마지막 줄만 말줄임한다', () => {
  const label = '첫번째 단계 이름 아주 긴 설명 문장 추가 정보 마지막 내용';
  const lines = wrapFunnelLabel(label);

  expect(lines).toHaveLength(2);
  expect(lines[1].endsWith('…')).toBe(true);

  for (const word of lines.join(' ').replace('…', '').split(' '))
    expect(label.split(' ')).toContain(word);
});
it('폭보다 긴 단어를 중간에서 분할하지 않는다', () => {
  expect(wrapFunnelLabel('공백없이너무길게이어진이벤트이름', 60)).toEqual([
    '…',
  ]);
});
it('폭이 충분하면 줄을 나누지 않고 공백만 정규화한다', () => {
  expect(wrapFunnelLabel('턴  1 채팅 메시지 전송', 200)).toEqual([
    '턴 1 채팅 메시지 전송',
  ]);
});

it('120px씩 배정한 7단계 폭에서도 메시지 전송과 스토리 상세 조회의 단어를 보존한다', () => {
  const width = (7 * 120 - 48 - 24) / 7 - 32;

  expect(wrapFunnelLabel('메시지 전송', width)).toEqual(['메시지 전송']);
  expect(wrapFunnelLabel('스토리 상세 조회', width)).toEqual([
    '스토리',
    '상세 조회',
  ]);
});
