import { TextLink } from '@/components/admin/data-ui';

export function SubmissionLinks({
  storyId,
  memberId,
  held = false,
}: {
  storyId?: string;
  memberId?: string;
  held?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {storyId ? (
        <>
          <TextLink
            href={`/moderation/submissions?storyId=${encodeURIComponent(storyId)}`}>
            제출 이력
          </TextLink>
          {held ? (
            <TextLink
              href={`/moderation/submissions?storyId=${encodeURIComponent(storyId)}&status=HELD`}>
              검수 보류 보기
            </TextLink>
          ) : null}
        </>
      ) : null}
      {memberId ? (
        <TextLink
          href={`/moderation/submissions?memberId=${encodeURIComponent(memberId)}`}>
          검수 제출
        </TextLink>
      ) : null}
    </div>
  );
}
