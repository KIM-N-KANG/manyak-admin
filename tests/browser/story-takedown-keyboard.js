/* global openTab, snapshot, sleep, assertSinglePost, waitForResult */
// 새 fixture 서버를 127.0.0.1:3187에서 실행한 뒤 Node 실행기로 검증한다.
// 실행 명령은 node tests/browser/run-story-takedown-keyboard.mjs다.
// JSDOM이 제공하지 않는 Tab 순서와 라디오 기본 키 동작을 실제 브라우저에서 검증한다.

function assertKeyboard(condition, message) {
  if (!condition) throw new Error(message);
}

{
  const submitKey = 'Enter';
  const suffix = '2';
  const memo = `KNK-1867-KEYBOARD-MEMO-${submitKey}`;
  const id = `00000002-0000-4000-8000-${suffix.padStart(12, '0')}`;
  const browser = await openTab(`http://127.0.0.1:3187/stories/${id}`);

  console.log((await snapshot(browser, { selector: 'main > div.mb-8' })).tree);
  assertKeyboard(
    await browser.evaluate(() =>
      document.body.innerText.includes('고정 데이터 미리보기'),
    ),
    'fixture 미리보기에서만 검증할 수 있다.',
  );

  await browser.evaluate(() => {
    const original = window.fetch;
    const posts = [];
    const events = [];
    const trace = (event) => {
      if (window.keyboardTakedownTest.recordKeys)
        events.push({
          type: event.type,
          key: event.key,
          code: event.code,
          trusted: event.isTrusted,
          target: event.target?.tagName,
          text: event.target?.textContent?.trim(),
        });
    };

    window.keyboardTakedownTest = {
      original,
      posts,
      events,
      trace,
      recordKeys: false,
    };

    for (const type of ['keydown', 'keyup', 'click'])
      document.addEventListener(type, trace, true);

    window.fetch = async (...args) => {
      const [input, options] = args;
      const method = (
        options?.method ?? (input instanceof Request ? input.method : 'GET')
      ).toUpperCase();
      const post =
        method === 'POST'
          ? {
              url:
                input instanceof Request
                  ? new URL(input.url).pathname
                  : String(input),
              body: null,
              status: null,
              error: null,
            }
          : null;

      if (post) {
        posts.push(post);

        const body =
          options?.body ??
          (input instanceof Request ? await input.clone().text() : null);

        post.body = typeof body === 'string' ? JSON.parse(body) : body;
      }

      try {
        const response = await Reflect.apply(original, window, args);

        if (post) post.status = response.status;

        return response;
      } catch (error) {
        if (post) post.error = String(error);

        throw error;
      }
    };
  });

  try {
    for (let tabs = 0; tabs < 40; tabs++) {
      if (
        await browser.evaluate(
          () =>
            document.activeElement?.tagName === 'BUTTON' &&
            document.activeElement.textContent.trim() === '공개 중단',
        )
      )
        break;

      await browser.keyboard.press('Tab');
    }

    assertKeyboard(
      await browser.evaluate(
        () => document.activeElement?.textContent.trim() === '공개 중단',
      ),
      'Tab으로 공개 중단 버튼에 도달해야 한다.',
    );
    await browser.keyboard.press('Enter');
    console.log((await snapshot(browser, { selector: '[role=dialog]' })).tree);
    assertKeyboard(
      await browser.evaluate(
        () => document.activeElement?.value === 'SEXUAL_CONTENT',
      ),
      '첫 사유에 초점이 있어야 한다.',
    );
    await browser.keyboard.press('ArrowRight');
    assertKeyboard(
      await browser.evaluate(
        () =>
          document.activeElement?.value === 'COPYRIGHT_INFRINGEMENT' &&
          document.activeElement.checked,
      ),
      '방향키로 저작권 침해를 선택해야 한다.',
    );

    await browser.keyboard.press('Tab');
    assertKeyboard(
      await browser.evaluate(
        () =>
          document.activeElement?.getAttribute('aria-label') === '메모 도움말',
      ),
      '사유 다음은 메모 도움말이어야 한다.',
    );
    await browser.keyboard.press('Tab');
    assertKeyboard(
      await browser.evaluate(
        () => document.activeElement?.tagName === 'TEXTAREA',
      ),
      'Tab으로 메모에 도달해야 한다.',
    );

    for (const key of memo)
      await browser.keyboard.press(key === '-' ? 'Minus' : key);

    assertKeyboard(
      (await browser.evaluate(() => document.activeElement?.value)) === memo,
      '키 입력으로 메모를 작성해야 한다.',
    );
    await browser.keyboard.press('Tab');
    assertKeyboard(
      await browser.evaluate(
        () => document.activeElement?.textContent.trim() === '취소',
      ),
      '메모 다음은 취소여야 한다.',
    );
    await browser.keyboard.press('Tab');
    assertKeyboard(
      await browser.evaluate(
        () => document.activeElement?.textContent.trim() === '공개 중단',
      ),
      'Tab으로 확인 버튼에 도달해야 한다.',
    );
    assertKeyboard(
      await browser.evaluate(() => {
        const button = document.activeElement;

        return (
          button?.tagName === 'BUTTON' &&
          button.type === 'button' &&
          !button.disabled &&
          button.closest('[role=dialog]') !== null &&
          button.textContent.trim() === '공개 중단'
        );
      }),
      '활성 대화상자의 활성 확인 버튼에 초점이 있어야 한다.',
    );
    await browser.evaluate(() => {
      window.keyboardTakedownTest.recordKeys = true;
    });
    await browser.keyboard.press(submitKey);

    const result = await waitForResult(
      () =>
        browser.evaluate(() => ({
          posts: window.keyboardTakedownTest.posts,
          events: window.keyboardTakedownTest.events,
          dialogOpen: Boolean(document.querySelector('[role=dialog]')),
          takenDown: Boolean(
            document.querySelector('main')?.innerText.includes('공개 중단됨'),
          ),
          alert: document.querySelector('[role=alert]')?.textContent,
          activeElement: {
            tag: document.activeElement?.tagName,
            text: document.activeElement?.textContent?.trim(),
          },
        })),
      sleep,
    );

    console.log(`${submitKey} observed=${JSON.stringify(result)}`);

    assertSinglePost(result.posts, {
      url: `/api/moderation/stories/${id}/takedown`,
      reasonCode: 'COPYRIGHT_INFRINGEMENT',
      memo,
    });
    console.log(
      (await snapshot(browser, { selector: 'main > div.mb-8' })).tree,
    );

    const storage = await browser.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
        cookie: document.cookie,
      }),
    );

    assertKeyboard(
      !storage.includes(memo),
      '메모가 브라우저 저장소에 남아서는 안 된다.',
    );
    console.log(
      `PASS keyboard ${submitKey}: Tab → 방향키 → 메모 키 입력 → Tab → ${submitKey} → POST 본문`,
    );
  } finally {
    await browser.evaluate(() => {
      window.fetch = window.keyboardTakedownTest.original;

      for (const type of ['keydown', 'keyup', 'click'])
        document.removeEventListener(
          type,
          window.keyboardTakedownTest.trace,
          true,
        );

      delete window.keyboardTakedownTest;
    });
  }
}
