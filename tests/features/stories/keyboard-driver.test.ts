import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

import { createKeyboardTestHelpers } from '../../browser/story-takedown-helpers.mjs';

const expected = {
  url: '/api/moderation/stories/story-id/takedown',
  reasonCode: 'COPYRIGHT_INFRINGEMENT',
  memo: 'KNK-1867-KEYBOARD-MEMO-Enter',
};
const helpers = createKeyboardTestHelpers();
const response = () => ({
  url: expected.url,
  // JSON 객체의 속성 순서와 무관하게 본문 값을 검사한다.
  body: { memo: expected.memo, reasonCode: expected.reasonCode },
  status: 200,
  error: null,
});

it('REPL에 전달하는 함수는 요청 검증과 대기만 제공한다', () => {
  const remoteHelpers = runInNewContext(
    `(${createKeyboardTestHelpers.toString()})()`,
  );

  expect(Object.keys(remoteHelpers).sort()).toEqual([
    'assertSinglePost',
    'waitForResult',
  ]);
  expect(() =>
    remoteHelpers.assertSinglePost([response()], expected),
  ).not.toThrow();
});

it('POST 검증은 JSON 속성 순서와 무관하게 본문의 키와 값을 비교한다', () => {
  expect(() => helpers.assertSinglePost([response()], expected)).not.toThrow();
});

it.each(
  [
    [],
    [response(), response()],
    [{ ...response(), url: '/wrong' }],
    [{ ...response(), status: 409 }],
    [
      {
        ...response(),
        body: { reasonCode: 'SEXUAL_CONTENT', memo: expected.memo },
      },
    ],
    [{ ...response(), body: { reasonCode: expected.reasonCode } }],
    [
      {
        ...response(),
        body: { ...response().body, reasonDetail: '보내면 안 되는 값' },
      },
    ],
  ].map((posts) => ({ posts })),
)(
  '누락·중복·본문·상태 오류를 무시하지 않고 관측 값을 제공한다: %j',
  ({ posts }) => {
    expect(() => helpers.assertSinglePost(posts, expected)).toThrow(
      /POST 불일치:.*observed=/,
    );
  },
);

it('2초를 넘는 응답과 그 뒤 상세 갱신까지 기다린다', async () => {
  let clock = 0;
  const state = () => ({
    posts: [{ ...response(), status: clock >= 2500 ? 200 : null }],
    dialogOpen: clock < 2500,
    takenDown: clock >= 3500,
  });
  const result = await helpers.waitForResult(
    async () => state(),
    async (duration: number) => {
      clock += duration;
    },
    { now: () => clock, timeoutMs: 5000 },
  );

  expect(clock).toBe(3500);
  expect(result).toEqual(state());
});

it('POST가 없으면 클릭·키·초점 증거를 포함해 제한 시간에 실패한다', async () => {
  let clock = 0;
  const state = {
    posts: [],
    dialogOpen: true,
    takenDown: false,
    events: [{ type: 'keyup', key: 'Enter', code: 'Enter' }],
    activeElement: { tag: 'BUTTON', text: '공개 중단' },
  };

  await expect(
    helpers.waitForResult(
      async () => state,
      async (duration: number) => {
        clock += duration;
      },
      { now: () => clock, timeoutMs: 300 },
    ),
  ).rejects.toThrow(
    `키보드 요청 또는 상세 갱신 대기 시간 초과: ${JSON.stringify(state)}`,
  );
  expect(clock).toBe(300);
});

it.each(
  [
    [response(), response()],
    [{ ...response(), status: 500 }],
    [{ ...response(), status: null, error: 'NetworkError' }],
  ].map((posts) => ({ posts })),
)(
  '중복·서버·네트워크 오류는 성공할 때까지 기다려 숨기지 않는다: %j',
  async ({ posts }) => {
    const pause = vi.fn();

    await expect(
      helpers.waitForResult(
        async () => ({ posts, dialogOpen: false, takenDown: true }),
        pause,
      ),
    ).rejects.toThrow('키보드 요청 실패:');
    expect(pause).not.toHaveBeenCalled();
  },
);
