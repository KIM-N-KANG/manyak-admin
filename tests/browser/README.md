# 스토리 공개 중단 키보드 검증

새 fixture 프로세스를 `127.0.0.1:3187`에서 실행하고 Aside CLI가 브라우저에 연결되는 환경에서 다음 명령을 실행한다. 두 fixture 스토리를 조치하므로 재실행 전 서버를 재시작한다. 운영에서는 실행하지 않는다.

```sh
npx -y pnpm@12.5.1 build
ADMIN_DATA_SOURCE=fixture VERCEL_ENV=preview npx -y pnpm@12.5.1 start --hostname 127.0.0.1 --port 3187
# 다른 터미널에서 실행한다.
node tests/browser/run-story-takedown-keyboard.mjs
```

테스트는 Tab으로 버튼에 도달해 Enter로 열고, 방향키와 Space로 사유를 선택한다. Tab으로 메모 칸에 이동해 키 입력으로 메모를 작성한 후 Tab으로 확인 버튼에 도달한다. Space와 Enter 제출을 각각 실행하고 정확한 POST 경로·사유·메모, 성공 후 상세 갱신과 브라우저 저장소의 메모 미노출을 검사한다. 조작에 click·fill·focus나 변경 이벤트 직접 주입을 사용하지 않는다. 요청 관측용 fetch 래퍼는 종료 시 복구한다.

브라우저 연결이나 스크립트 오류가 있으면 실행기가 실패한다. 이 검사는 JSDOM에 없는 브라우저 기본 키 동작을 검증하므로 `pnpm test`의 Vitest 검사와 별도로 실행한다. 새 패키지 의존성을 추가하지 않는다.

Space는 테스트의 `pressKey`가 해당 탭의 CDP 세션에 표준 `key: ' '`, `code: 'Space'`의 keyDown/keyUp을 보낸다. 설치된 Aside 1.26.1024.24의 `keyboard.press('Space')`는 `key: 'Space'`를 보내므로 그대로 사용하지 않는다. 화면의 click 핸들러나 DOM 값을 직접 호출·변경하는 방식으로 대체하지 않는다. 제출 시 실제 수신한 키 값과 신뢰 이벤트 여부도 검사한다. 나머지 키는 기존 키보드 드라이버로 보낸다.

POST 한 건의 200 응답과 대화상자 닫힘·상세 배지를 최대 10초 기다린 후 본문을 구조적으로 비교한다. 속성 순서는 무시하되 본문의 키·값, URL, 중복 요청, 실패 응답은 엄격히 검사한다. 실패 로그에는 실제 요청 본문·HTTP 상태·네트워크 오류, 수신 keydown/keyup/click, 현재 초점·대화상자·화면 오류가 포함된다. 테스트 입력은 고정된 식별 문자열만 사용한다.

Space 이벤트 패킷, REPL 함수 전달, 요청 비교, 지연·오류 분기는 `tests/features/stories/keyboard-driver.test.ts`에서 Vitest로 검증한다. 이 단위 검증은 실제 브라우저에서 수행하는 전체 키보드 시나리오를 대신하지 않는다.
