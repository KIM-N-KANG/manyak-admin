import { noticeTagLabel } from '@/features/notices/tags';

export function NoticeTagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-flex rounded-sm border bg-muted px-2 py-1 text-xs">
      {noticeTagLabel(tag)}
    </span>
  );
}
