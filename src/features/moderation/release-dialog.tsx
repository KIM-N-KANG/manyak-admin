'use client';

import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { customInstance, FetchError } from '@/api/mutator/custom-instance';
import { ReasonDialog, reasonSchema } from '@/components/admin/reason-dialog';

export function useSubmissionRelease() {
  const client = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(0);
  const trigger = useRef<HTMLElement | null>(null);
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
    <ReasonDialog
      open={selected !== null}
      title="보류 해제"
      description="이 제출본을 대기로 돌려 다음 검수에서 새 회차로 다시 검수합니다. 재시도 예산도 처음으로 돌아갑니다."
      reason={reason}
      onReasonChange={setReason}
      pending={pending}
      error={error}
      finalFocus={trigger}
      onClose={close}
      onConfirm={confirm}
    />
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
