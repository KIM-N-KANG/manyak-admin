import { ComingSoon } from '@/components/admin/coming-soon';
import { validId } from '@/fixtures/query';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ storyId?: string | string[] }>;
}) {
  const { storyId } = await searchParams;
  const valid = typeof storyId === 'string' && validId(storyId);

  return (
    <ComingSoon
      title="새 캠페인"
      description={
        valid
          ? `이 스토리로 이동하는 캠페인입니다. 스토리 ID: ${storyId} · 작성 기능은 준비 중입니다.`
          : '홍보할 스토리를 선택하세요. 캠페인 작성 기능은 준비 중입니다.'
      }
    />
  );
}
