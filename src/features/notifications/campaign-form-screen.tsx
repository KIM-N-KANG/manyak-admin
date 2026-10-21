'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  dateTime,
  PageHeading,
  QueryState,
  TextLink,
} from '@/components/admin/data-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useManagementMutation } from '@/features/management/mutation';
import type { Campaign, TargetCount } from '@/features/notifications/types';
import { ConfirmDialog } from '@/features/originals/confirm-dialog';
import type { Page } from '@/features/shared/types';
import { useApi } from '@/features/shared/use-api';
import type { Story } from '@/features/stories/types';

export function CampaignFormScreen({ storyId = '' }: { storyId?: string }) {
  const [kind, setKind] = useState('MARKETING');
  const [story, setStory] = useState(storyId);
  const [search, setSearch] = useState('');
  const [immediate, setImmediate] = useState(true);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [formError, setFormError] = useState('');
  const target = useApi<TargetCount>(
    `/api/notifications/campaigns/target-count?kind=${kind}`,
  );
  const stories = useApi<Page<Story>>(
    `/api/stories?size=20${search ? `&q=${encodeURIComponent(search)}` : ''}`,
  );
  const mutation = useManagementMutation();
  const router = useRouter();

  async function confirm() {
    if (!draft) return;

    const result = await mutation.run<Campaign>(
      '/api/notifications/campaigns',
      'POST',
      draft,
    );

    if (result) router.push(`/notifications/campaigns/${result.campaignId}`);
  }

  function prepare(form: FormData) {
    setFormError('');

    const scheduled = String(form.get('scheduledAt') ?? '');

    if (!immediate && (!scheduled || Date.parse(scheduled) <= Date.now())) {
      setFormError('예약 시각은 현재 이후여야 합니다.');

      return;
    }

    if (story) {
      setFormError(
        '스토리로 이동하는 캠페인은 아직 지원하지 않습니다. 이동 대상 없음을 선택해 주세요.',
      );

      return;
    }

    mutation.setError('');
    setDraft({
      title: form.get('title'),
      body: form.get('body'),
      reason: form.get('reason'),
      ...(!immediate ? { scheduledAt: new Date(scheduled).toISOString() } : {}),
    });
  }

  return (
    <>
      <PageHeading
        title="새 캠페인"
        description="대상 수와 문구를 확인한 뒤 예약하거나 즉시 발송하세요.">
        <TextLink href="/notifications/campaigns">목록으로</TextLink>
      </PageHeading>
      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            prepare(new FormData(event.currentTarget));
          }}
          className="grid max-w-3xl gap-5">
          <label className="grid gap-2 text-sm">
            종류
            <select
              className="control"
              value={kind}
              onChange={(e) => setKind(e.target.value)}>
              <option value="MARKETING">광고성</option>
              <option value="SERVICE">정보성 공지</option>
            </select>
          </label>
          {kind === 'SERVICE' ? (
            <p className="text-sm">
              정보성은 서비스 알림 동의자에게 야간 제한 없이 발송합니다. 공지를
              게시하며 알림을 보냅니다.{' '}
              <TextLink href="/notices/new">공지 작성으로 이동</TextLink>
            </p>
          ) : null}
          <label className="grid gap-2 text-sm">
            제목 (광고 표기 없이)
            <input className="control" name="title" required maxLength={100} />
          </label>
          <label className="grid gap-2 text-sm">
            본문
            <textarea
              className="control min-h-28"
              name="body"
              required
              maxLength={300}
            />
          </label>
          <div className="grid gap-3 rounded-md border p-4">
            <label className="grid gap-2 text-sm">
              홍보할 스토리 검색
              <input
                className="control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={50}
              />
            </label>
            <QueryState
              pending={stories.isPending}
              error={stories.error}
              retry={stories.refetch}
            />
            <label className="grid gap-2 text-sm">
              이동 대상 스토리
              <select
                className="control"
                value={story}
                onChange={(e) => setStory(e.target.value)}>
                <option value="">이동 대상 없음</option>
                {story &&
                !stories.data?.items.some((i) => i.storyId === story) ? (
                  <SelectedStoryOption id={story} />
                ) : null}
                {stories.data?.items.map((i) => (
                  <option key={i.storyId} value={i.storyId}>
                    {i.title}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-muted-foreground">
              스토리 이동 대상은 선택 미리보기만 지원합니다. 현재 서버 계약에
              저장 필드가 없어 선택한 상태에서는 발송할 수 없습니다.
            </p>
            {story ? (
              <TextLink href={`/stories/${story}`}>선택한 스토리 확인</TextLink>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={immediate}
              onChange={(e) => setImmediate(e.target.checked)}
            />
            즉시 발송
          </label>
          {!immediate ? (
            <label className="grid gap-2 text-sm">
              예약 시각 (현재 기기 시간대)
              <input
                className="control"
                type="datetime-local"
                name="scheduledAt"
                required
              />
            </label>
          ) : null}
          <label className="grid gap-2 text-sm">
            발송 사유
            <input className="control" name="reason" required maxLength={500} />
          </label>
          <QueryState
            pending={target.isPending}
            error={target.error}
            retry={target.refetch}
          />
          {target.data ? (
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <p>
                대상 수 미리보기:{' '}
                <strong className="text-link">
                  {target.data.targetCount.toLocaleString()}명
                </strong>
              </p>
              <p className="mt-2">
                야간 광고 수신 동의자:{' '}
                {target.data.nightEligibleCount?.toLocaleString() ??
                  '해당 없음'}
                명 · 현재 KST {target.data.nightNow ? '야간' : '주간'}
              </p>
              <p className="mt-2 text-muted-foreground">
                집계 시각: {dateTime(target.data.asOf)}. 실제 발송 시 대상은
                달라질 수 있습니다.
              </p>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            광고성 알림은 광고 수신에 동의한 회원만 대상입니다. (광고) 표시와
            수신 거부 안내가 추가됩니다. KST 21:00~08:00에는 야간 광고 수신
            동의자만 대상입니다. 정보성은 서비스 알림 동의자에게 야간 제한 없이
            발송합니다.
          </p>
          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={
              mutation.pending ||
              !target.data ||
              !!target.error ||
              kind !== 'MARKETING'
            }>
            대상 확인 후 {immediate ? '발송' : '예약'}
          </Button>
        </form>
      </Card>
      <ConfirmDialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
        title={immediate ? '캠페인을 발송할까요?' : '캠페인을 예약할까요?'}
        description={`광고성 알림은 광고 수신에 동의한 회원만 대상입니다. KST 21:00~08:00에는 야간 광고 수신 동의자에게만 발송합니다. 현재 대상 ${target.data?.targetCount.toLocaleString() ?? '—'}명, 야간 광고 동의 ${target.data?.nightEligibleCount?.toLocaleString() ?? '—'}명입니다. 실제 발송 대상은 달라질 수 있습니다.`}
        pending={mutation.pending}
        error={mutation.error}
        onConfirm={() => void confirm()}
      />
    </>
  );
}

function SelectedStoryOption({ id }: { id: string }) {
  const q = useApi<Story>(`/api/stories/${encodeURIComponent(id)}`);

  return <option value={id}>{q.data?.title ?? id}</option>;
}
