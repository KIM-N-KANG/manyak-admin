export const cohorts = [
  ['visitor', '방문자'],
  ['signup', '가입자'],
  ['first-chat', '채팅 시작자'],
] as const;
/** 서버의 앱 플랫폼 기록 배포일이 확정되면 KST 날짜를 넣는다. */
export const APP_PLATFORM_RECORDED_FROM = '';
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
