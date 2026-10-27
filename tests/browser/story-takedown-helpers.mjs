/** 외부 모듈이 없는 브라우저 REPL에도 같은 함수를 전달할 수 있는 검증 도구다. */
export function createKeyboardTestHelpers() {
  async function pressKey(browser, key) {
    if (key !== 'Space') return browser.keyboard.press(key);

    // Aside 1.26.1024.24의 Space 별칭은 key: 'Space'를 보낸다. DOM 표준 값은 공백이다.
    const sessionId = await browser.resolveSessionId();
    const keyEvent = { key: ' ', code: 'Space', windowsVirtualKeyCode: 32 };

    await browser.cdp.send(
      'Input.dispatchKeyEvent',
      { ...keyEvent, type: 'keyDown', text: ' ', unmodifiedText: ' ' },
      sessionId,
    );
    await browser.cdp.send(
      'Input.dispatchKeyEvent',
      { ...keyEvent, type: 'keyUp' },
      sessionId,
    );
  }

  function assertSinglePost(posts, expected) {
    const post = posts[0];
    const body = post?.body;
    const keys =
      body && typeof body === 'object' ? Object.keys(body).sort() : [];

    if (
      posts.length !== 1 ||
      post.url !== expected.url ||
      post.status !== 200 ||
      post.error ||
      JSON.stringify(keys) !== JSON.stringify(['memo', 'reasonCode']) ||
      body.reasonCode !== expected.reasonCode ||
      body.memo !== expected.memo
    )
      throw new Error(
        `POST 불일치: expected=${JSON.stringify(expected)}, observed=${JSON.stringify(posts)}`,
      );
  }

  async function waitForResult(read, pause, options = {}) {
    const { timeoutMs = 10_000, now = Date.now } = options;
    const deadline = now() + timeoutMs;
    let state;

    do {
      state = await read();

      if (
        state.posts.length === 1 &&
        state.posts[0].status === 200 &&
        !state.dialogOpen &&
        state.takenDown
      )
        return state;

      if (
        state.posts.length > 1 ||
        state.posts.some(
          (post) => post.error || (post.status !== null && post.status !== 200),
        )
      )
        throw new Error(`키보드 요청 실패: ${JSON.stringify(state)}`);

      if (now() >= deadline) break;

      await pause(100);
    } while (now() <= deadline);

    throw new Error(
      `키보드 요청 또는 상세 갱신 대기 시간 초과: ${JSON.stringify(state)}`,
    );
  }

  return { pressKey, assertSinglePost, waitForResult };
}
