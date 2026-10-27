'use client';

import { type ReactNode, useId, useState, useSyncExternalStore } from 'react';

import { Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { FetchError } from '@/api/mutator/custom-instance';
import { dateTime, PageHeading, TextLink } from '@/components/admin/data-ui';
import { reasonSchema } from '@/components/admin/reason-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { useManagementMutation } from '@/features/management/mutation';
import {
  formatDuration,
  formatKst,
  fromKst,
  isNightKst,
  scheduleError,
} from '@/features/notifications/schedule';
import {
  NightWarning,
  type ScheduleDraft,
  ScheduleField,
  type SendMode,
  toDraft,
} from '@/features/notifications/schedule-field';
import { StoryPicker } from '@/features/notifications/story-picker';
import type {
  Campaign,
  CampaignCreateRequest,
  NotificationKind,
  TargetCount,
} from '@/features/notifications/types';
import { ConfirmDialog } from '@/features/originals/confirm-dialog';
import { useApi } from '@/features/shared/use-api';
import type { Story } from '@/features/stories/types';
import { cn } from '@/lib/utils';

const titleLimit = 100;
const bodyLimit = 300;
const reasonLimit = 500;
const adMark = '(광고)';
const count = (value: number) => value.toLocaleString('ko-KR');

// 30초마다 갱신하는 현재 시각이다. 서버 렌더링에서는 0을 돌려 하이드레이션 불일치를 막는다.
let clock = 0;

function subscribeClock(notify: () => void) {
  clock = Date.now();

  const timer = setInterval(() => {
    clock = Date.now();
    notify();
  }, 30_000);

  return () => clearInterval(timer);
}

function useNow() {
  const value = useSyncExternalStore(
    subscribeClock,
    () => clock || (clock = Date.now()),
    () => 0,
  );

  return value ? new Date(value) : null;
}

/** 광고성이면 서버가 붙이는 광고 표기를 제목 앞에 붙인다. 이미 붙어 있으면 다시 붙이지 않는다. */
export function displayTitle(kind: NotificationKind, title: string) {
  return kind === 'MARKETING' && !title.startsWith(adMark)
    ? `${adMark} ${title}`
    : title;
}

function notFound(error: Error | null) {
  return error instanceof FetchError && error.status === 404;
}

function storyProblem(story: Story | undefined, error: Error | null) {
  if (error)
    return notFound(error)
      ? '스토리를 찾을 수 없습니다. 다른 스토리를 선택하거나 선택을 해제해 주세요.'
      : '스토리 정보를 불러오지 못했습니다. 다시 시도하거나 다른 스토리를 선택해 주세요.';

  if (story?.deletedAt)
    return '삭제된 스토리입니다. 공개 스토리만 이동 대상으로 지정할 수 있습니다.';

  if (story && story.visibility !== 'PUBLIC')
    return '비공개 스토리입니다. 공개 스토리만 이동 대상으로 지정할 수 있습니다.';

  return '';
}

function Step({
  index,
  title,
  done,
  optional,
  children,
}: {
  index: number;
  title: string;
  done: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <Card aria-labelledby={id} className="p-0">
      <header className="flex items-center gap-3 border-b px-6 py-4">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors duration-150 motion-reduce:transition-none',
            done
              ? 'bg-primary-text text-primary-foreground'
              : 'border text-muted-foreground',
          )}>
          {done ? <HugeiconsIcon icon={Tick02Icon} size={14} /> : index}
        </span>
        <h2 id={id} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        {optional ? (
          <span className="text-xs text-muted-foreground">선택 사항</span>
        ) : null}
      </header>
      <div className="grid gap-5 p-6">{children}</div>
    </Card>
  );
}

function TextField({
  label,
  name,
  value,
  limit,
  placeholder,
  help,
  warn = false,
  multiline = false,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  limit: number;
  placeholder: string;
  help?: string;
  warn?: boolean;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const props = {
    id,
    name,
    value,
    maxLength: limit,
    placeholder,
    'aria-describedby': `${id}-count${help ? ` ${id}-help` : ''}`,
    onChange: (event: { target: { value: string } }) =>
      onChange(event.target.value),
  };

  return (
    <div className="grid gap-2 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id}>{label}</label>
        <span
          id={`${id}-count`}
          className={cn(
            'text-xs tabular-nums',
            value.length >= limit * 0.9
              ? 'text-warning-foreground'
              : 'text-muted-foreground',
          )}>
          {value.length}/{limit}
        </span>
      </div>
      {multiline ? (
        <textarea {...props} className="control min-h-28 py-2 leading-6" />
      ) : (
        <input {...props} className="control" />
      )}
      {help ? (
        <p
          id={`${id}-help`}
          className={cn(
            'text-xs',
            warn ? 'text-warning-foreground' : 'text-muted-foreground',
          )}>
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** 휴대폰 알림 모양 미리보기. 광고성이면 서버가 붙이는 광고 표기를 함께 보인다. */
function NotificationPreview({
  kind,
  title,
  body,
}: {
  kind: NotificationKind;
  title: string;
  body: string;
}) {
  return (
    <figure
      aria-label="알림 미리보기"
      className="rounded-md border bg-gradient-to-b from-muted to-background px-4 pt-5 pb-4">
      <div className="mx-auto max-w-sm rounded-2xl border bg-card p-3.5 shadow-[0_6px_20px_-10px_rgb(0_0_0/0.25)]">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/manyak-symbol-green.svg"
            alt=""
            className="size-5 rounded-[5px] border bg-card p-0.5"
          />
          <span className="font-medium text-foreground-secondary">마냑</span>
          <span aria-hidden="true">·</span>
          <span>지금</span>
        </div>
        <p
          data-testid="preview-title"
          className={cn(
            'mt-2 text-sm font-semibold break-words',
            !title.trim() && 'text-foreground-faint',
          )}>
          {displayTitle(kind, title.trim() || '제목을 입력해 주세요')}
        </p>
        <p
          data-testid="preview-body"
          className={cn(
            'mt-0.5 line-clamp-4 text-sm leading-5 break-words whitespace-pre-line',
            body.trim() ? 'text-foreground-secondary' : 'text-foreground-faint',
          )}>
          {body.trim() || '본문을 입력하면 여기에 표시됩니다.'}
        </p>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted-foreground">
        {kind === 'MARKETING'
          ? '(광고) 표기는 발송할 때 서버가 제목 앞에 붙입니다.'
          : '기기와 브라우저에 따라 긴 본문은 잘립니다.'}
      </figcaption>
    </figure>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function CampaignFormScreen({
  storyId: initialStoryId = '',
}: {
  storyId?: string;
}) {
  const [kind, setKind] = useState<NotificationKind>('MARKETING');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [reason, setReason] = useState('');
  const [storyId, setStoryId] = useState(initialStoryId);
  const [picked, setPicked] = useState<Story | null>(null);
  const [mode, setMode] = useState<SendMode>('now');
  const [draft, setDraft] = useState<ScheduleDraft>({
    date: '',
    hour: '',
    minute: '',
  });
  const [confirming, setConfirming] = useState(false);
  const now = useNow();
  const mutation = useManagementMutation();
  const router = useRouter();
  const target = useApi<TargetCount>(
    `/api/notifications/campaigns/target-count?kind=${kind}`,
  );
  const detail = useApi<Story>(
    `/api/stories/${encodeURIComponent(storyId)}`,
    !!storyId,
  );
  const story =
    detail.data ?? (picked?.storyId === storyId ? picked : undefined);
  const problem = storyId ? storyProblem(story, detail.error) : '';
  const marketing = kind === 'MARKETING';
  const scheduledAt =
    mode === 'later' && draft.date && draft.hour && draft.minute
      ? fromKst(draft.date, Number(draft.hour), Number(draft.minute))
      : null;
  const timeError =
    mode === 'later' && now ? scheduleError(scheduledAt, now) : '';
  const sendAt = mode === 'now' ? now : timeError ? null : scheduledAt;
  const night = marketing && !!sendAt && isNightKst(sendAt);
  const recipients = night
    ? target.data?.nightEligibleCount
    : target.data?.targetCount;
  const reasonValid = reasonSchema.safeParse(reason).success;
  const titleHasMark = title.trim().startsWith(adMark);
  const blocker = !marketing
    ? '정보성 알림은 공지 작성에서 보냅니다.'
    : !title.trim()
      ? '제목을 입력해 주세요.'
      : !body.trim()
        ? '본문을 입력해 주세요.'
        : problem
          ? '이동 대상 스토리를 변경하거나 선택 해제해 주세요.'
          : storyId && !story
            ? '이동 대상 스토리를 확인하고 있습니다.'
            : mode === 'later' && (!now || timeError)
              ? scheduledAt
                ? '예약 시각을 현재 이후로 바꿔 주세요.'
                : '예약 날짜와 시각을 선택해 주세요.'
              : !reasonValid
                ? '발송 사유를 입력해 주세요.'
                : target.isError
                  ? '받을 사람 수를 불러오지 못했습니다. 다시 집계해 주세요.'
                  : !target.data
                    ? '받을 사람 수를 집계하고 있습니다.'
                    : '';
  const sendLabel = mode === 'now' ? '발송' : '예약';
  const sendTime =
    mode === 'now'
      ? '지금 바로'
      : scheduledAt && !timeError
        ? `${formatKst(scheduledAt)} KST`
        : '미정';
  const untilSend =
    mode === 'later' && scheduledAt && !timeError && now
      ? `${formatDuration(scheduledAt.getTime() - now.getTime())} 뒤`
      : '';

  function selectStory(next: Story | null) {
    setPicked(next);
    setStoryId(next?.storyId ?? '');
  }

  async function confirm() {
    if (
      mode === 'later' &&
      (!scheduledAt || scheduledAt.getTime() <= Date.now())
    ) {
      mutation.setError(
        '예약 시각이 지났습니다. 취소를 누르고 시각을 다시 선택해 주세요.',
      );

      return;
    }

    const request: CampaignCreateRequest = {
      title: title.trim(),
      body: body.trim(),
      reason: reason.trim(),
      ...(storyId ? { storyId } : {}),
      ...(mode === 'later' && scheduledAt
        ? { scheduledAt: scheduledAt.toISOString() }
        : {}),
    };
    const result = await mutation.run<Campaign>(
      '/api/notifications/campaigns',
      'POST',
      request,
    );

    if (result) router.push(`/notifications/campaigns/${result.campaignId}`);
  }

  return (
    <>
      <PageHeading title="새 캠페인">
        <TextLink href="/notifications/campaigns">목록으로</TextLink>
      </PageHeading>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();

          if (blocker) return;

          mutation.setError('');
          setConfirming(true);
        }}
        className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-6">
          <Step
            index={1}
            title="알림 내용"
            done={marketing && !!title.trim() && !!body.trim()}>
            <SegmentedControl
              legend="종류"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'MARKETING', label: '광고성' },
                { value: 'SERVICE', label: '정보성' },
              ]}
            />
            {marketing ? (
              <>
                <p className="-mt-2 text-sm text-muted-foreground">
                  광고 수신에 동의하고 알림 기기를 등록한 회원에게 갑니다.
                </p>
                <TextField
                  label="제목"
                  name="title"
                  value={title}
                  limit={titleLimit}
                  placeholder="예: 주말 한정 이프 2배 이벤트"
                  warn={titleHasMark}
                  help={
                    titleHasMark
                      ? '(광고) 표기는 자동으로 붙으니 빼고 입력해 주세요.'
                      : '(광고) 표기는 서버가 붙이니 빼고 입력합니다.'
                  }
                  onChange={setTitle}
                />
                <TextField
                  label="본문"
                  name="body"
                  value={body}
                  limit={bodyLimit}
                  placeholder="예: 이번 주말 충전하면 이프를 두 배로 드려요."
                  multiline
                  onChange={setBody}
                />
              </>
            ) : (
              <div className="rounded-md border bg-muted/40 p-4 text-sm">
                <p className="font-medium">
                  정보성 알림은 공지와 함께 보냅니다.
                </p>
                <p className="mt-1 leading-6 text-muted-foreground">
                  공지를 게시하면 서비스 알림을 켠 회원에게 야간 제한 없이
                  알림이 갑니다. 이 화면에서는 광고성 알림만 만들 수 있습니다.
                </p>
                <Link
                  href="/notices/new"
                  className={cn(
                    buttonVariants({ variant: 'outline' }),
                    'mt-3',
                  )}>
                  공지 작성으로 이동
                </Link>
              </div>
            )}
          </Step>
          {marketing ? (
            <>
              <Step
                index={2}
                title="이동 대상"
                optional
                done={!!story && !problem}>
                <StoryPicker
                  storyId={storyId}
                  story={story}
                  pending={detail.isPending}
                  problem={problem}
                  onRetry={
                    detail.isError && !notFound(detail.error)
                      ? () => void detail.refetch()
                      : undefined
                  }
                  onChange={selectStory}
                />
              </Step>
              <Step index={3} title="발송 시각" done={!!sendAt}>
                <ScheduleField
                  mode={mode}
                  draft={draft}
                  scheduledAt={scheduledAt}
                  error={timeError}
                  now={now}
                  onModeChange={setMode}
                  onDraftChange={setDraft}
                />
                {night && sendAt ? (
                  <NightWarning
                    sendAt={sendAt}
                    nightEligible={target.data?.nightEligibleCount}
                    target={target.data?.targetCount}
                    onMove={(at) => {
                      setMode('later');
                      setDraft(toDraft(at));
                    }}
                  />
                ) : null}
              </Step>
              <Step index={4} title="발송 사유" done={reasonValid}>
                <TextField
                  label="사유"
                  name="reason"
                  value={reason}
                  limit={reasonLimit}
                  placeholder="예: 10월 마지막 주 주말 프로모션"
                  help="감사 로그에 캠페인 내용과 함께 남습니다."
                  onChange={setReason}
                />
              </Step>
            </>
          ) : null}
        </div>
        <aside
          aria-label="미리보기와 요약"
          className="grid gap-4 xl:sticky xl:top-10">
          <NotificationPreview kind={kind} title={title} body={body} />
          <Card className="p-0">
            <dl className="divide-y px-5 text-sm">
              <SummaryRow label="받을 사람">
                {target.data ? (
                  <>
                    <span className="text-2xl font-semibold tracking-tight tabular-nums">
                      {count(recipients ?? 0)}
                    </span>
                    <span className="ml-0.5">명</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {night
                        ? `광고 동의 ${count(target.data.targetCount)}명 중 야간 광고 동의자`
                        : marketing
                          ? '광고 수신에 동의하고 알림 기기를 등록한 회원'
                          : '서비스 알림을 켜고 알림 기기를 등록한 회원'}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {dateTime(target.data.asOf)} 집계
                      <button
                        type="button"
                        onClick={() => void target.refetch()}
                        disabled={target.isFetching}
                        className="rounded-sm text-link underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
                        {target.isFetching ? '집계 중…' : '다시 집계'}
                      </button>
                    </span>
                  </>
                ) : target.isError ? (
                  <span role="alert">
                    집계하지 못했습니다.{' '}
                    <button
                      type="button"
                      onClick={() => void target.refetch()}
                      className="rounded-sm text-link underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">
                      다시 집계
                    </button>
                  </span>
                ) : (
                  <span role="status" aria-label="받을 사람 수 집계 중">
                    <Skeleton className="h-8 w-24" />
                  </span>
                )}
              </SummaryRow>
              {marketing ? (
                <>
                  <SummaryRow label="발송 시각">
                    {sendTime}
                    {untilSend ? (
                      <span className="block text-xs text-muted-foreground">
                        {untilSend}
                      </span>
                    ) : null}
                    {night ? (
                      <span className="mt-1 inline-flex h-5 items-center rounded-sm bg-warning-soft px-1.5 text-xs font-medium text-warning-foreground">
                        야간 규칙 적용
                      </span>
                    ) : null}
                  </SummaryRow>
                  <SummaryRow label="누르면">
                    {story && !problem ? (
                      <span className="font-medium">{story.title}</span>
                    ) : problem ? (
                      <span className="text-destructive-deep">
                        이동 대상 확인 필요
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        이동 대상 없음
                      </span>
                    )}
                  </SummaryRow>
                </>
              ) : null}
            </dl>
            <div className="grid gap-2 border-t p-5">
              <Button
                type="submit"
                disabled={!!blocker || mutation.pending}
                className="w-full">
                검토 후 {sendLabel}
              </Button>
              <p
                aria-live="polite"
                className="text-center text-xs text-muted-foreground">
                {blocker || '다음 단계에서 내용을 한 번 더 확인합니다.'}
              </p>
            </div>
          </Card>
          <p className="px-1 text-xs leading-5 text-muted-foreground">
            받을 사람 수는 지금 기준입니다. 실제 대상은 발송할 때 다시 집계해
            달라질 수 있습니다.
          </p>
        </aside>
      </form>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={mode === 'now' ? '캠페인을 발송할까요?' : '캠페인을 예약할까요?'}
        description="발송이 시작되면 멈출 수 없습니다. 예약은 발송 시작 전까지 캠페인 상세에서 취소할 수 있습니다."
        confirmLabel={sendLabel}
        pending={mutation.pending}
        error={mutation.error}
        onConfirm={() => void confirm()}>
        <dl className="mt-5 divide-y rounded-md border px-4 text-sm">
          <SummaryRow label="종류">광고성</SummaryRow>
          <SummaryRow label="제목">
            {displayTitle(kind, title.trim())}
          </SummaryRow>
          <SummaryRow label="이동 대상">
            {story && !problem ? story.title : '없음'}
          </SummaryRow>
          <SummaryRow label="발송 시각">
            {sendTime}
            {untilSend ? (
              <span className="block text-xs text-muted-foreground">
                {untilSend}
              </span>
            ) : null}
          </SummaryRow>
          <SummaryRow label="대상 인원">
            {recipients != null ? `약 ${count(recipients)}명` : '확인 중'}
          </SummaryRow>
          <SummaryRow label="야간 규칙">
            {night ? '적용, 야간 광고 동의자에게만 발송' : '적용 안 함'}
          </SummaryRow>
        </dl>
      </ConfirmDialog>
    </>
  );
}
