export const noticeTags = [
  { value: 'SERVICE', label: '공지사항' },
  { value: 'UPDATE', label: '업데이트' },
  { value: 'MAINTENANCE', label: '점검' },
  { value: 'EVENT', label: '이벤트' },
  { value: 'PROMOTION', label: '홍보' },
] as const;

export const noticeTagHelp =
  '이벤트와 홍보는 광고성 알림으로 광고 수신에 동의한 회원에게만 가고 알림 제목 앞에 (광고)가 자동으로 붙습니다. 공지사항, 업데이트, 점검은 모든 회원에게 갑니다.';

export function noticeTagLabel(tag: string) {
  return noticeTags.find((option) => option.value === tag)?.label ?? tag;
}

export function isMarketingNoticeTag(tag: string) {
  return tag === 'EVENT' || tag === 'PROMOTION';
}

export function noticePublishConfirmation(tag: string) {
  return isMarketingNoticeTag(tag)
    ? '게시하면 광고 수신에 동의한 회원에게 광고 알림이 갑니다. 게시할까요?'
    : '게시하면 회원에게 알림이 갑니다. 게시할까요?';
}
