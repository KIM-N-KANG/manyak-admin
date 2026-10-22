// manyak-web의 CREDIT_REASON_LABEL과 같은 원장 사유 문구를 사용한다.
const reasonLabels: Record<string, string> = {
  SIGNUP_REWARD: '가입 보상',
  ATTENDANCE_REWARD: '출석 체크 보상',
  INVITE_REWARD: '친구 초대 보상',
  REFUND: '사용 취소',
  STORY_CREATION: '스토리 완성',
  CHAT_TURN: '채팅 전송',
  CHAT_IMAGE: '채팅 실시간 이미지 생성',
  EXPIRE: '기간 만료',
  PURCHASE: '이프 구매',
  PURCHASE_REVERSAL: '구매 환불',
  ADMIN_GRANT: '관리자 지급',
  ADMIN_REVOKE: '관리자 회수',
};

export function creditReasonLabel(reason: string) {
  return Object.hasOwn(reasonLabels, reason)
    ? reasonLabels[reason]
    : '이프 변동';
}
