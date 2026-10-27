/* global openTab, snapshot, sleep */
// 새 fixture 서버를 127.0.0.1:3187에서 실행한 뒤 Node 실행기로 검증한다.
// 실행 명령은 node tests/browser/run-story-takedown-keyboard.mjs다.
// JSDOM이 제공하지 않는 Tab 순서와 라디오 기본 키 동작을 실제 브라우저에서 검증한다.

function assertKeyboard(condition, message) {
  if (!condition) throw new Error(message);
}

for (const [suffix, submitKey] of [
  ['2', 'Space'],
  ['3', 'Enter'],
]) {
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

    window.keyboardTakedownTest = { original, posts };
    window.fetch = async (url, options) => {
      if (options?.method === 'POST')
        posts.push({ url: String(url), body: JSON.parse(options.body) });

      return original(url, options);
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
    await browser.keyboard.press('Space');
    assertKeyboard(
      await browser.evaluate(
        () =>
          document.activeElement?.value === 'COPYRIGHT_INFRINGEMENT' &&
          document.activeElement.checked,
      ),
      '방향키와 Space로 저작권 침해를 선택해야 한다.',
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
    await browser.keyboard.press(submitKey);
    console.log(
      (await snapshot(browser, { selector: 'main > div.mb-8' })).tree,
    );

    for (let attempt = 0; attempt < 10; attempt++) {
      if (
        await browser.evaluate(() =>
          document.querySelector('main')?.innerText.includes('공개 중단됨'),
        )
      )
        break;

      await sleep(200);
    }

    const posts = await browser.evaluate(
      () => window.keyboardTakedownTest.posts,
    );

    assertKeyboard(
      JSON.stringify(posts) ===
        JSON.stringify([
          {
            url: `/api/moderation/stories/${id}/takedown`,
            body: { reasonCode: 'COPYRIGHT_INFRINGEMENT', memo },
          },
        ]),
      `${submitKey} 확인은 정확한 POST 한 번을 보내야 한다.`,
    );
    assertKeyboard(
      await browser.evaluate(
        () =>
          !document.querySelector('[role=dialog]') &&
          document.querySelector('main')?.innerText.includes('공개 중단됨'),
      ),
      '성공 후 대화상자가 닫히고 상세가 갱신되어야 한다.',
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
      `PASS keyboard ${submitKey}: Tab → 방향키/Space → 메모 키 입력 → Tab → ${submitKey} → POST 본문`,
    );
  } finally {
    await browser.evaluate(() => {
      window.fetch = window.keyboardTakedownTest.original;
      delete window.keyboardTakedownTest;
    });
  }
}
