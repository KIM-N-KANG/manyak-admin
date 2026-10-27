# 스토리 공개 중단 키보드 검증

새 fixture 프로세스를 `127.0.0.1:3187`에서 실행하고 Aside CLI가 브라우저에 연결되는 환경에서 다음 명령을 실행한다. fixture 스토리 한 개를 조치하므로 재실행 전 서버를 재시작한다. 운영에서는 실행하지 않는다.

```sh
npx -y pnpm@12.5.1 build
ADMIN_DATA_SOURCE=fixture VERCEL_ENV=preview npx -y pnpm@12.5.1 start --hostname 127.0.0.1 --port 3187
# 다른 터미널에서 실행한다.
node tests/browser/run-story-takedown-keyboard.mjs
```

브라우저 실검증은 **Enter 제출 한 시나리오**다. Tab으로 버튼에 도달해 Enter로 열고, 방향키로 저작권 침해를 선택한다. Tab으로 메모 칸에 이동해 키 입력으로 메모를 작성한 후 Tab으로 확인 버튼에 도달해 Enter로 제출한다. 정확한 POST 1회·경로·사유·메모·200 응답, 대화상자 닫힘과 상세 공개 중단 표시, 브라우저 저장소의 메모 미노출을 검사한다. click·fill·focus나 DOM 변경 이벤트 직접 주입을 사용하지 않는다.

POST 200 응답과 상세 갱신을 최대 10초 기다린 뒤 본문을 구조적으로 비교한다. 속성 순서는 무시하되 본문의 키·값, URL, 중복 요청, 실패 응답은 엄격히 검사한다. 실패 로그에는 실제 요청 본문·HTTP 상태·네트워크 오류, 수신 keydown/keyup/click, 현재 초점·대화상자·화면 오류가 포함된다. 요청 관측용 fetch 래퍼와 이벤트 리스너는 종료 시 복구한다. 테스트 입력은 고정된 식별 문자열만 사용한다.

Aside REPL에서 CDP 세션을 사용할 수 없으므로 CDP 경로와 Space 브라우저 시나리오는 두지 않는다. Space는 네이티브 버튼의 브라우저 기본 동작에 맡긴다. `package.json`에 `@testing-library/user-event`가 없으므로 새 의존성을 추가하지 않고, `takedown-screen.test.ts`에서 확인 버튼의 네이티브 `BUTTON`·`type="button"` 계약과 수동 key 핸들러에 의한 직접 제출 부재, click당 정확한 POST 1회·본문을 검증한다. 이 검사는 실제 Space 기본 동작을 실행한 결과로 해석하지 않는다.

브라우저 연결이나 스크립트 오류가 있으면 실행기가 실패한다. `pnpm test`의 Vitest 검사와 별도로 실행하며, Enter의 PASS 표식을 확인한다. 요청 비교·지연·오류 분기는 `tests/features/stories/keyboard-driver.test.ts`에서도 검증한다. 이 단위 검증은 실제 Enter 키보드 시나리오를 대신하지 않는다.
