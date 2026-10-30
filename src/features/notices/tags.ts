export const noticeTags = [
  { value: 'SERVICE', label: '공지사항' },
  { value: 'UPDATE', label: '업데이트' },
  { value: 'MAINTENANCE', label: '점검' },
  { value: 'EVENT', label: '이벤트' },
  { value: 'PROMOTION', label: '홍보' },
] as const;

export const noticeTagHelp =
  '공지사항, 업데이트, 점검은 정보성이고 이벤트와 홍보는 광고성입니다. 이 공지로 알림을 보내면 태그에 따라 알림 성격이 정해집니다. 정보성은 활성 회원 전체의 알림함에 표시되고 푸시는 서비스 알림 설정과 기기 수신 가능 여부에 따라 발송됩니다. 광고성은 광고 수신에 동의한 활성 회원의 알림함에 원문으로 표시되고 푸시 제목 앞에는 (광고)가 자동으로 붙습니다. 푸시는 광고 수신 동의, 야간 수신 동의, 기기 수신 가능 여부에 따라 발송됩니다.';

export function noticeTagLabel(tag: string) {
  return noticeTags.find((option) => option.value === tag)?.label ?? tag;
}

export function isMarketingNoticeTag(tag: string) {
  return tag === 'EVENT' || tag === 'PROMOTION';
}

export function noticePublishConfirmation() {
  return '게시하면 회원과 게스트에게 공지가 보입니다. 알림은 가지 않으며 게시한 뒤 알림 보내기로 따로 보냅니다. 게시할까요?';
}
