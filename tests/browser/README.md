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
