'use client';

import { useEffect, useRef, useState } from 'react';

import { Dialog } from '@base-ui/react/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { customInstance, FetchError } from '@/api/mutator/custom-instance';
import { Button } from '@/components/ui/button';

const reasonSchema = z.string().trim().min(1).max(500);

export function SuccessNotice() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);

    return () => clearTimeout(timer);
  }, []);

  return visible ? (
    <p role="status" className="mb-4 text-sm text-primary-text">
      보류를 해제했습니다.
    </p>
  ) : null;
}

export function useSubmissionRelease() {
  const client = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(0);
  const trigger = useRef<HTMLElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const valid = reasonSchema.safeParse(reason).success;

  const refresh = async (id: string, missing = false) => {
    const detailKey = [`/api/moderation/submissions/${id}`];

    if (missing) {
      await client.resetQueries({ queryKey: detailKey, exact: true });
      await client.refetchQueries({
        queryKey: detailKey,
        exact: true,
        type: 'inactive',
      });
    }

    await client.invalidateQueries({
      predicate: (query) => {
        const url = query.queryKey[0];

        return (
          typeof url === 'string' &&
          (url.split('?')[0] === '/api/moderation/submissions' ||
            (!missing && url === `/api/moderation/submissions/${id}`))
        );
      },
      refetchType: 'all',
    });
    await client.invalidateQueries({
      queryKey: detailKey,
      exact: true,
      type: 'inactive',
      refetchType: 'none',
    });
  };

  function close() {
    setSelected(null);
    setReason('');
    setError('');
  }

  async function confirm() {
    if (!selected || !valid || pending) return;

    const id = selected;

    setPending(true);
    setError('');

    try {
      await customInstance(
        `/api/moderation/holds/${encodeURIComponent(id)}/release`,
        { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) },
      );
      close();
      setSuccess((count) => count + 1);
      await refresh(id);
    } catch (failure) {
      const status = failure instanceof FetchError ? failure.status : 0;

      if (status === 404 || status === 409) await refresh(id, status === 404);

      setError(
        status === 409
          ? '이미 보류가 풀린 제출본입니다. 목록을 새로 불러왔습니다.'
          : status === 404
            ? '제출본을 찾을 수 없습니다. 목록을 새로 불러왔습니다.'
            : '보류를 해제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setPending(false);
    }
  }

  const dialog = (
    <Dialog.Root
      open={selected !== null}
      onOpenChange={(open, details) => {
        if (pending) {
          details.cancel();

          return;
        }

        if (!open) close();
      }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Popup
          initialFocus={input}
          finalFocus={trigger}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-3rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-card p-6 shadow-lg">
          <Dialog.Title className="text-xl font-semibold">
            보류 해제
          </Dialog.Title>
          <Dialog.Description className="mt-4 text-sm leading-6 text-muted-foreground">
            이 제출본을 대기로 돌려 다음 검수에서 새 회차로 다시 검수합니다.
            재시도 예산도 처음으로 돌아갑니다.
          </Dialog.Description>
          <label className="mt-5 flex flex-col gap-2 text-sm">
            처리 사유
            <textarea
              ref={input}
              className="control min-h-24"
              value={reason}
              disabled={pending}
              maxLength={500}
              aria-invalid={Boolean(error) || (reason.length > 0 && !valid)}
              aria-describedby={
                error || (reason.length > 0 && !valid)
                  ? 'release-error'
                  : undefined
              }
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {error || (reason.length > 0 && !valid) ? (
            <p
              id="release-error"
              role="alert"
              className="mt-2 text-sm text-destructive">
              {error || '처리 사유를 입력해 주세요.'}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" disabled={pending} onClick={close}>
              취소
            </Button>
            <Button disabled={!valid || pending} onClick={confirm}>
              {pending ? '처리 중…' : '확인'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );

  return {
    success,
    dialog,
    open: (id: string, element: HTMLElement) => {
      trigger.current = element;
      setSelected(id);
      setReason('');
      setError('');
    },
  };
}
