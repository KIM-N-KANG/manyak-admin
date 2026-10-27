'use client';

import { useId, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { customInstance, FetchError } from '@/api/mutator/custom-instance';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { SuccessNotice } from '@/components/admin/reason-dialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/features/originals/confirm-dialog';
import {
  canTakeDown,
  type TakedownReason,
  takedownReasons,
} from '@/features/stories/takedown';
import type { Story } from '@/features/stories/types';

export function StoryTakedown({ story }: { story: Story }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<TakedownReason | ''>('');
  const [detail, setDetail] = useState('');
  const [memo, setMemo] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const id = useId();
  const missingDetail = reason === 'ETC' && !detail.trim();
  const valid = Boolean(reason) && !missingDetail;

  function changeOpen(value: boolean) {
    setOpen(value);

    setReason('');
    setDetail('');
    setMemo('');
    setError('');
  }

  async function confirm() {
    if (!valid || pending) return;

    setPending(true);
    setError('');

    const detailUrl = `/api/stories/${encodeURIComponent(story.storyId)}`;
    const invalidateList = () =>
      client.invalidateQueries({
        predicate: (query) =>
          typeof query.queryKey[0] === 'string' &&
          query.queryKey[0].split('?')[0] === '/api/stories',
      });

    try {
      await customInstance(
        `/api/moderation/stories/${encodeURIComponent(story.storyId)}/takedown`,
        {
          method: 'POST',
          body: JSON.stringify({
            reasonCode: reason,
            ...(reason === 'ETC' ? { reasonDetail: detail.trim() } : {}),
            ...(memo.trim() ? { memo: memo.trim() } : {}),
          }),
        },
      );
      changeOpen(false);
      setSuccess((count) => count + 1);
      await Promise.all([
        invalidateList(),
        client.invalidateQueries({ queryKey: [detailUrl], exact: true }),
      ]);
    } catch (failure) {
      const status = failure instanceof FetchError ? failure.status : 0;

      if (status === 409)
        await client.invalidateQueries({ queryKey: [detailUrl], exact: true });

      if (status === 404) await invalidateList();

      setError(
        status === 409
          ? '공개 중단할 수 없는 상태의 스토리입니다. 상세를 새로 불러왔습니다.'
          : status === 404
            ? '스토리를 찾을 수 없습니다. 목록에서 다시 확인해 주세요.'
            : '공개를 중단하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {success > 0 ? (
        <SuccessNotice key={success} message="공개 중단 조치를 적용했습니다." />
      ) : null}
      {canTakeDown(story) ? (
        <Button
          ref={trigger}
          variant="destructive"
          onClick={() => changeOpen(true)}>
          공개 중단
        </Button>
      ) : null}
      <ConfirmDialog
        open={open}
        onOpenChange={changeOpen}
        title="스토리 공개 중단"
        description="이 스토리를 비공개로 두고 소유자에게 사유를 알립니다. 이미 비공개인 스토리도 소유자가 내용을 고쳐 검수를 통과하기 전까지 공개할 수 없습니다. 관리자는 공개 중단을 되돌릴 수 없습니다."
        pending={pending}
        onConfirm={confirm}
        error={error}
        canConfirm={valid}
        confirmLabel="공개 중단"
        confirmVariant="destructive"
        initialFocus={first}
        finalFocus={trigger}>
        <fieldset disabled={pending} className="mt-5 space-y-2 text-sm">
          <legend className="mb-2">공개 중단 사유</legend>
          {Object.entries(takedownReasons).map(([code, label], index) => (
            <label key={code} className="flex min-h-9 items-center gap-2">
              <input
                ref={index === 0 ? first : undefined}
                type="radio"
                name={`${id}-reason`}
                value={code}
                checked={reason === code}
                onChange={() => {
                  setReason(code as TakedownReason);
                  setDetail('');
                }}
              />
              {label}
            </label>
          ))}
        </fieldset>
        {reason === 'ETC' ? (
          <div className="mt-4 text-sm">
            <div className="mb-2 flex items-center gap-2">
              <label htmlFor={`${id}-detail`}>소유자에게 보일 사유</label>
              <HelpTooltip label="소유자에게 보일 사유 도움말">
                {
                  '소유자 알림의 "{사유} 사유로 공개할 수 없어요"에 그대로 들어갑니다. 짧은 명사구로 적어 주세요.'
                }
              </HelpTooltip>
            </div>
            <input
              id={`${id}-detail`}
              className="control w-full"
              value={detail}
              maxLength={100}
              disabled={pending}
              placeholder="예: 실존 인물 비방"
              aria-invalid={missingDetail}
              aria-describedby={missingDetail ? `${id}-missing` : undefined}
              onChange={(event) => setDetail(event.target.value.slice(0, 100))}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {detail.length}/100
            </p>
            {missingDetail ? (
              <p id={`${id}-missing`} className="mt-2 text-destructive">
                소유자에게 보일 사유를 입력해 주세요.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 text-sm">
          <div className="mb-2 flex items-center gap-2">
            <label htmlFor={`${id}-memo`}>메모 (선택)</label>
            <HelpTooltip label="메모 도움말">
              감사 로그에만 남고 소유자에게 보내지 않습니다.
            </HelpTooltip>
          </div>
          <textarea
            id={`${id}-memo`}
            className="control min-h-24 w-full"
            value={memo}
            disabled={pending}
            maxLength={500}
            onChange={(event) => setMemo(event.target.value.slice(0, 500))}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {memo.length}/500
          </p>
        </div>
      </ConfirmDialog>
    </>
  );
}
