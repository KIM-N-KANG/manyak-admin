'use client';

import { useId } from 'react';

import { Calendar03Icon, Moon02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  formatDuration,
  formatKst,
  kstParts,
  nextDaytime,
  padTime,
  quickPicks,
} from '@/features/notifications/schedule';
import { cn } from '@/lib/utils';

export type SendMode = 'now' | 'later';
export type ScheduleDraft = { date: string; hour: string; minute: string };

const hours = Array.from({ length: 24 }, (_, i) => i);
const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

/** 시각을 KST 예약 입력값으로 바꾼다. */
export function toDraft(at: Date): ScheduleDraft {
  const { date, hour, minute } = kstParts(at);

  return { date, hour: String(hour), minute: String(minute) };
}

/** 야간 광고 경고. 주간으로 옮길 시각을 함께 제안한다. */
export function NightWarning({
  sendAt,
  nightEligible,
  target,
  onMove,
}: {
  sendAt: Date;
  nightEligible: number | null | undefined;
  target: number | undefined;
  onMove: (at: Date) => void;
}) {
  const morning = nextDaytime(sendAt);

  return (
    <div
      role="status"
      className="flex gap-3 rounded-md border border-warning/50 bg-warning-soft/60 p-4 text-sm">
      <HugeiconsIcon
        icon={Moon02Icon}
        size={20}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-warning-foreground"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-warning-foreground">
          야간 광고 시간대입니다
        </p>
        <p className="mt-1 leading-6 text-foreground-secondary">
          KST 21:00~08:00에는 야간 광고 수신에도 동의한 회원에게만 갑니다. 지금
          집계로는{' '}
          <strong className="font-semibold text-foreground tabular-nums">
            {nightEligible == null
              ? '확인 중'
              : `${nightEligible.toLocaleString('ko-KR')}명`}
          </strong>
          {target != null
            ? `이 받습니다(광고 수신 동의 ${target.toLocaleString('ko-KR')}명 중).`
            : '이 받습니다.'}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => onMove(morning)}>
          {formatKst(morning)}로 예약
        </Button>
      </div>
    </div>
  );
}

/** 지금 발송과 KST 고정 예약을 고르는 발송 시각 구역. */
export function ScheduleField({
  mode,
  draft,
  scheduledAt,
  error,
  now,
  onModeChange,
  onDraftChange,
}: {
  mode: SendMode;
  draft: ScheduleDraft;
  scheduledAt: Date | null;
  error: string;
  now: Date | null;
  onModeChange: (mode: SendMode) => void;
  onDraftChange: (draft: ScheduleDraft) => void;
}) {
  const id = useId();
  const today = now ? kstParts(now).date : undefined;
  const picks = now ? quickPicks(now) : [];

  return (
    <div className="grid gap-5">
      <SegmentedControl
        legend="발송 방식"
        value={mode}
        onChange={onModeChange}
        options={[
          { value: 'now', label: '지금 발송' },
          { value: 'later', label: '예약 발송' },
        ]}
      />
      {mode === 'now' ? (
        <p className="text-sm text-muted-foreground">
          확정하면 바로 발송을 시작합니다.
          {now ? ` 지금은 KST ${formatKst(now)}입니다.` : null}
        </p>
      ) : (
        <>
          <div className="grid gap-2">
            <p id={`${id}-quick`} className="text-sm">
              빠른 선택
            </p>
            <div
              role="group"
              aria-labelledby={`${id}-quick`}
              className="flex flex-wrap gap-2">
              {picks.map((pick) => {
                const pressed =
                  !!scheduledAt && scheduledAt.getTime() === pick.at.getTime();

                return (
                  <button
                    key={pick.label}
                    type="button"
                    disabled={pick.disabled}
                    aria-pressed={pressed}
                    onClick={() => onDraftChange(toDraft(pick.at))}
                    className={cn(
                      'h-8 rounded-full border px-3 text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:text-foreground-faint disabled:line-through motion-reduce:transition-none',
                      pressed
                        ? 'border-primary-text bg-link-soft font-medium text-primary-text'
                        : 'bg-card hover:bg-muted',
                    )}>
                    {pick.label}
                  </button>
                );
              })}
            </div>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm">
              직접 입력{' '}
              <span className="text-muted-foreground">
                (한국 시간 기준, 기기 시간대와 무관)
              </span>
            </legend>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                aria-label="예약 날짜"
                className="control w-40"
                min={today}
                value={draft.date}
                onChange={(event) =>
                  onDraftChange({ ...draft, date: event.target.value })
                }
              />
              <select
                aria-label="예약 시"
                className="control w-24"
                value={draft.hour}
                onChange={(event) =>
                  onDraftChange({ ...draft, hour: event.target.value })
                }>
                <option value="">시</option>
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {padTime(hour)}시
                  </option>
                ))}
              </select>
              <span aria-hidden="true">:</span>
              <select
                aria-label="예약 분"
                className="control w-24"
                value={draft.minute}
                onChange={(event) =>
                  onDraftChange({ ...draft, minute: event.target.value })
                }>
                <option value="">분</option>
                {minutes.map((minute) => (
                  <option key={minute} value={minute}>
                    {padTime(minute)}분
                  </option>
                ))}
              </select>
              <span className="inline-flex h-6 items-center rounded-sm border bg-muted px-2 font-mono text-xs">
                KST
              </span>
            </div>
          </fieldset>
          <div
            aria-live="polite"
            className={cn(
              'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
              error && scheduledAt
                ? 'border-destructive/40 text-destructive-deep'
                : 'bg-muted/40',
            )}>
            <HugeiconsIcon
              icon={Calendar03Icon}
              size={18}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-muted-foreground"
            />
            {scheduledAt && !error ? (
              <p>
                <span className="font-semibold">
                  {formatKst(scheduledAt)} KST
                </span>{' '}
                발송
                {now ? (
                  <span className="block text-muted-foreground">
                    지금부터{' '}
                    {formatDuration(scheduledAt.getTime() - now.getTime())} 뒤
                  </span>
                ) : null}
              </p>
            ) : (
              <p role={scheduledAt ? 'alert' : undefined}>
                {error || '예약 날짜와 시각을 선택해 주세요.'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
