// ADMIN 웹 정본의 원장 사유 표시 이름을 사용한다.
const reasonLabels: Record<string, string> = {
  SIGNUP_REWARD: '가입 보상',
  ATTENDANCE_REWARD: '출석체크 보상',
  INVITE_REWARD: '초대 보상',
  REFUND: 'AI 실패 환불',
  STORY_CREATION: '간편 제작',
  CHAT_TURN: '채팅 턴 소모',
  CHAT_IMAGE: '채팅 실시간 이미지 생성',
  EXPIRE: '기간 만료',
  PURCHASE: '이프 충전',
  PURCHASE_REVERSAL: '구매 환불 회수',
  ADMIN_GRANT: '관리자 지급',
  ADMIN_REVOKE: '관리자 회수',
};

export function creditReasonLabel(reason: string) {
  return Object.hasOwn(reasonLabels, reason)
    ? reasonLabels[reason]
    : '이프 변동';
}
