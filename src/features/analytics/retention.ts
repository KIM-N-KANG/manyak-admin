export const cohorts = [
  ['visitor', '방문자'],
  ['signup', '가입자'],
  ['first-chat', '채팅 시작자'],
] as const;
/** 앱 플랫폼을 싣는 서버 v0.12.5의 운영 배포일이며 KST 기준이다. */
export const APP_PLATFORM_RECORDED_FROM = '2026-10-28';
export function retentionHelp(
  cohort = 'visitor',
  recordedFrom = APP_PLATFORM_RECORDED_FROM,
) {
  return (
    '시작일 기준이며 D30은 30일이 지난 뒤에 채워집니다.' +
    (cohort === 'visitor'
      ? ''
      : ' 2026-10-22까지의 시작일은 게스트의 서버 이벤트가 기기 활동과 병합되지 않아 복귀가 실제와 다를 수 있습니다.' +
        (recordedFrom
          ? ` ${recordedFrom} 전 시작일은 앱 요청의 서버 이벤트에 플랫폼이 없어 앱 사용자가 앱 코호트에서 빠질 수 있습니다.`
          : ''))
  );
}
