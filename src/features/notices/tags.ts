export const noticeTags = [
  { value: 'SERVICE', label: '공지사항' },
  { value: 'UPDATE', label: '업데이트' },
  { value: 'MAINTENANCE', label: '점검' },
  { value: 'EVENT', label: '이벤트' },
  { value: 'PROMOTION', label: '홍보' },
] as const;

export const noticeTagHelp =
  '공지사항, 업데이트, 점검은 활성 회원 전체의 알림 내역에 표시됩니다. 푸시는 서비스 알림 설정과 기기 수신 가능 여부에 따라 발송됩니다. 이벤트와 홍보는 광고성 알림으로 광고 수신에 동의한 활성 회원의 알림 내역에 표시되고 알림 제목 앞에 (광고)가 자동으로 붙습니다. 푸시는 광고 수신 동의, 야간 수신 동의, 기기 수신 가능 여부에 따라 발송됩니다.';

export function noticeTagLabel(tag: string) {
  return noticeTags.find((option) => option.value === tag)?.label ?? tag;
}

export function isMarketingNoticeTag(tag: string) {
  return tag === 'EVENT' || tag === 'PROMOTION';
}

export function noticePublishConfirmation(
  tag: string,
  notifiedAt: string | null,
) {
  if (notifiedAt)
    return '이미 알림을 요청한 공지입니다. 다시 게시해도 알림을 다시 요청하지 않습니다. 게시할까요?';

  return isMarketingNoticeTag(tag)
    ? '게시하면 광고 수신에 동의한 회원에게 광고 알림이 갑니다. 게시할까요?'
    : '게시하면 회원에게 알림이 갑니다. 게시할까요?';
}
