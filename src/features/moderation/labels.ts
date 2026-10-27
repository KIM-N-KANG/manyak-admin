export const submissionStatuses = {
  PENDING: '대기',
  HELD: '보류',
  APPROVED: '승인',
  REJECTED: '반려',
  FAILED: '실패',
};
export function statusLabel(code: string) {
  return (submissionStatuses as Record<string, string>)[code] ?? code;
}
export function kindLabel(code: string) {
  return (
    ({ CREATE: '등록', UPDATE: '수정' } as Record<string, string>)[code] ?? code
  );
}
export function ruleLabel(code: string) {
  return (
    (
      {
        EXPLICIT_SEXUAL_CONTENT: '노골적인 성적 표현',
        DRUGS: '마약',
        EXTREME_GORE: '극단적인 잔혹 표현',
        SELF_HARM_PROMOTION: '자살과 자해 조장',
        HATE_VIOLENCE_INCITEMENT: '혐오 폭력 선동',
        GAMBLING_PROMOTION: '불법 도박 사이트 이용 안내',
      } as Record<string, string>
    )[code] ?? code
  );
}
export function imageStatusLabel(code: string) {
  return (
    (
      {
        APPROVED: '통과',
        REJECTED: '반려',
        ERROR: '오류',
        PENDING: '판정 전',
      } as Record<string, string>
    )[code] ?? code
  );
}
export function causeLabel(code: string | null) {
  return code
    ? ((
        {
          IMAGE_DOWNLOAD_FAILED: '이미지 내려받기 실패',
          MODEL_CALL_FAILED: '검수 모델 호출 실패',
          MODERATION_UNAVAILABLE: '검수 서버 응답 실패',
          IMAGE_INVALID: '이미지 형식 또는 크기 오류',
          IMAGE_UNREADABLE: '이미지 판독 불가',
          APPLY_FAILED: '승인 뒤 적용 실패',
          STORY_TAKEN_DOWN: '스토리 공개 중단으로 종료',
        } as Record<string, string>
      )[code] ?? code)
    : '';
}
export function pathLabel(path: string) {
  const exact = (
    {
      title: '제목',
      oneLineIntro: '한 줄 소개',
      description: '주요 내용',
      protagonistName: '기본 주인공 이름',
      'storySettings.worldSetting': '세계관 설정',
      'storySettings.characterSetting': '인물 설정',
      'storySettings.userRoleSetting': '주인공 역할 설정',
      'storySettings.ruleSetting': '전개 규칙',
      thumbnailUrl: '표지',
    } as Record<string, string>
  )[path];

  if (exact) return exact;

  const image = /^characters\[(\d+)\]\.images\[(\d+)\](?:$|\.|\[)/.exec(path);

  if (image)
    return `인물 ${Number(image[1]) + 1} 이미지 ${Number(image[2]) + 1}`;

  const match = /^(characters|startSettings|mainEvents)\[(\d+)\]\.(\w+)$/.exec(
    path,
  );

  if (!match) return path;

  const fields: Record<string, Record<string, string>> = {
    characters: { name: '이름', description: '소개' },
    startSettings: {
      name: '상황 이름',
      prologue: '프롤로그',
      startSituation: '시작 상황',
    },
    mainEvents: { name: '이름', description: '설명', keySentence: '키 문장' },
  };
  const field = fields[match[1]][match[3]];
  const group = {
    characters: '인물',
    startSettings: '시작 설정',
    mainEvents: '주요 사건',
  }[match[1] as 'characters' | 'startSettings' | 'mainEvents'];

  return field ? `${group} ${Number(match[2]) + 1} ${field}` : path;
}
export const issueHelp =
  '검수에서 찾은 위반 항목입니다. 사용자가 고쳐 다시 제출하며 관리자는 판정을 바꾸지 않습니다.';
export const causeHelp =
  '보류 사유에는 마지막 검수 실행의 실패 원인을, 실패 원인에는 최종 실패 원인을 표시합니다. 보류된 제출본은 원인을 조치한 뒤 해제해 주세요.';
export const fieldsHelp =
  '설정 본문, 시작 설정, 주요 사건은 검수 제출 상세에 보이지 않습니다. 그 필드의 위반 항목은 위치와 이유로 판단해 주세요.';

export const attemptHelp =
  '접수 때 1이고 선점과 재제출마다 늘어나는 실행 구분 번호입니다. 실행 횟수와 다릅니다.';
