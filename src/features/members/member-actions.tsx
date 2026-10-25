'use client';

import { useContext, useId, useRef, useState } from 'react';

import { QueryClientContext } from '@tanstack/react-query';
import { z } from 'zod';

import { adjustBodyAmountMax } from '@/api/generated/zod/admin';
import { customInstance, FetchError } from '@/api/mutator/custom-instance';
import { ReasonDialog, SuccessNotice } from '@/components/admin/reason-dialog';
import { Button } from '@/components/ui/button';
import type { MemberDetail } from '@/features/members/types';
import { cn } from '@/lib/utils';

type Action = 'GRANT' | 'REVOKE' | 'SUSPEND' | 'UNSUSPEND';

const amountSchema = z.coerce.number().int().min(1).max(adjustBodyAmountMax);
const daysSchema = z.coerce.number().int().min(1).max(365);
const titles: Record<Action, string> = {
  GRANT: '이프 지급',
  REVOKE: '이프 회수',
  SUSPEND: '계정 정지',
  UNSUSPEND: '계정 정지 해제',
};
const failures: Record<Action, string> = {
  GRANT: '이프를 지급하지 못했습니다.',
  REVOKE: '이프를 회수하지 못했습니다.',
  SUSPEND: '계정을 정지하지 못했습니다.',
  UNSUSPEND: '계정 정지를 해제하지 못했습니다.',
};

const ifs = (value: number) => `${value.toLocaleString('ko-KR')} 이프`;

function errorMessage(action: Action, failure: unknown) {
  const status = failure instanceof FetchError ? failure.status : 0;
  const code =
    failure instanceof FetchError &&
    failure.data &&
    typeof failure.data === 'object' &&
    'code' in failure.data
      ? failure.data.code
      : null;

  if (status === 404)
    return '회원을 찾을 수 없습니다. 회원 정보를 새로 불러왔습니다.';

  if (code === 'ADMIN_ACCOUNT_PROTECTED')
    return '관리자 역할이 있는 회원은 정지할 수 없습니다.';

  if (code === 'IDEMPOTENCY_KEY_CONFLICT')
    return '이미 처리된 요청과 내용이 달라 처리하지 않았습니다. 대화상자를 닫고 다시 시도해 주세요.';

  if (status === 409)
    return action === 'GRANT' || action === 'REVOKE'
      ? '탈퇴한 회원입니다. 회원 정보를 새로 불러왔습니다.'
      : '계정 상태가 이미 바뀌었습니다. 회원 정보를 새로 불러왔습니다.';

  if (status === 400) return '입력값을 확인해 주세요.';

  return `${failures[action]} 잠시 후 다시 시도해 주세요.`;
}

/** 회원 상세의 이프 지급·회수와 계정 정지·해제 확인 대화상자. */
export function MemberActions({ member }: { member: MemberDetail }) {
  // 조회를 모의한 상세 화면 테스트처럼 공급자가 없어도 버튼을 그릴 수 있게 문맥을 직접 읽는다.
  const client = useContext(QueryClientContext);
  const [action, setAction] = useState<Action | null>(null);
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');
  const [reason, setReason] = useState('');
  const [key, setKey] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ id: number; message: string }>();
  const trigger = useRef<HTMLElement | null>(null);
  const amountInput = useRef<HTMLInputElement | null>(null);
  const noteId = useId();
  const adjusting = action === 'GRANT' || action === 'REVOKE';
  const parsedAmount = amountSchema.safeParse(amount);
  const parsedDays = days === '' ? null : daysSchema.safeParse(days);
  const fieldsValid =
    !adjusting ||
    (parsedAmount.success &&
      (action === 'REVOKE' || parsedDays === null || parsedDays.success));
  const deleted = member.status === 'DELETED';
  const suspended = member.status === 'SUSPENDED';
  const note = deleted
    ? '탈퇴한 회원은 이프 조정과 계정 정지를 할 수 없습니다.'
    : member.isAdmin && !suspended
      ? '관리자 역할이 있는 회원은 정지할 수 없습니다.'
      : null;

  function open(next: Action, element: HTMLElement) {
    trigger.current = element;
    setAction(next);
    setAmount('');
    setDays('');
    setReason('');
    setError('');
    setKey(crypto.randomUUID());
  }

  function close() {
    setAction(null);
    setError('');
  }

  // 재시도는 같은 멱등 키를 쓰고 금액이나 유효기간을 바꾸면 새 요청으로 본다.
  function change(setter: (value: string) => void, value: string) {
    setter(value);
    setKey(crypto.randomUUID());
  }

  async function confirm() {
    if (!action || pending) return;

    const current = action;

    setPending(true);
    setError('');

    try {
      if (current === 'GRANT' || current === 'REVOKE') {
        const result = await customInstance<{
          data: { appliedAmount: number; shortfall: number };
        }>('/api/credits/adjustments', {
          method: 'POST',
          body: JSON.stringify({
            memberId: member.memberId,
            type: current,
            amount: Number(amount),
            ...(current === 'GRANT' && days !== ''
              ? { expiresInDays: Number(days) }
              : {}),
            idempotencyKey: key,
            reason: reason.trim(),
          }),
        });
        const { appliedAmount, shortfall } = result.data;

        setSuccess({
          id: Date.now(),
          message:
            current === 'GRANT'
              ? `${ifs(appliedAmount)}를 지급했습니다.`
              : shortfall > 0
                ? `${ifs(appliedAmount)}를 회수했습니다. 잔액이 모자라 ${ifs(shortfall)}는 회수하지 못했습니다.`
                : `${ifs(appliedAmount)}를 회수했습니다.`,
        });
      } else {
        await customInstance(
          `/api/members/${encodeURIComponent(member.memberId)}/suspension`,
          {
            method: current === 'SUSPEND' ? 'POST' : 'DELETE',
            body: JSON.stringify({ reason: reason.trim() }),
          },
        );
        setSuccess({
          id: Date.now(),
          message:
            current === 'SUSPEND'
              ? '계정을 정지했습니다.'
              : '계정 정지를 해제했습니다.',
        });
      }

      close();
      await client?.invalidateQueries();
    } catch (failure) {
      setError(errorMessage(current, failure));

      if (failure instanceof FetchError && [404, 409].includes(failure.status))
        await client?.invalidateQueries();
    } finally {
      setPending(false);
    }
  }

  const amountValue = parsedAmount.success ? parsedAmount.data : null;
  const fieldClass = 'mt-5 flex flex-col gap-2 text-sm';

  return (
    <>
      {success ? (
        <SuccessNotice key={success.id} message={success.message} />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={deleted}
          aria-describedby={deleted ? noteId : undefined}
          onClick={(event) => open('GRANT', event.currentTarget)}>
          이프 지급
        </Button>
        <Button
          variant="outline"
          disabled={deleted}
          aria-describedby={deleted ? noteId : undefined}
          onClick={(event) => open('REVOKE', event.currentTarget)}>
          이프 회수
        </Button>
        <Button
          variant={suspended ? 'outline' : 'destructive'}
          disabled={deleted || (member.isAdmin && !suspended)}
          aria-describedby={note ? noteId : undefined}
          onClick={(event) =>
            open(suspended ? 'UNSUSPEND' : 'SUSPEND', event.currentTarget)
          }>
          {suspended ? '정지 해제' : '계정 정지'}
        </Button>
      </div>
      {note ? (
        <p id={noteId} className="mt-2 text-sm text-muted-foreground">
          {note}
        </p>
      ) : null}
      <ReasonDialog
        open={action !== null}
        title={action ? titles[action] : ''}
        description={
          action === 'GRANT'
            ? `${member.nickname} 회원에게 이프를 지급합니다. 지급한 이프는 유효기간이 지나면 소멸합니다.`
            : action === 'REVOKE'
              ? `${member.nickname} 회원의 이프를 회수합니다. 현재 잔액은 ${ifs(member.creditBalance)}이고, 잔액보다 큰 금액은 잔액만큼만 회수됩니다.`
              : action === 'SUSPEND'
                ? `${member.nickname} 회원의 계정을 정지합니다. 정지된 회원은 제작, 채팅, 프로필 수정 같은 서비스 이용이 막힙니다. 처리 사유는 감사 로그에만 남고 회원에게 보이지 않습니다.`
                : `${member.nickname} 회원의 계정 정지를 해제합니다. 해제하면 다시 제작과 채팅을 할 수 있습니다.`
        }
        reason={reason}
        onReasonChange={setReason}
        pending={pending}
        error={error}
        canConfirm={fieldsValid}
        initialFocus={adjusting ? amountInput : undefined}
        finalFocus={trigger}
        onClose={close}
        onConfirm={confirm}
        summary={
          adjusting && amountValue !== null && fieldsValid ? (
            <p className="mt-5 rounded-sm bg-muted px-3 py-2 text-sm leading-6">
              {action === 'GRANT'
                ? `${member.nickname} 회원에게 ${ifs(amountValue)}를 지급합니다. 유효기간은 ${days || 30}일입니다.`
                : amountValue > member.creditBalance
                  ? `${member.nickname} 회원에게서 ${ifs(amountValue)} 회수를 요청합니다. 현재 잔액이 ${ifs(member.creditBalance)}라 잔액만큼만 회수됩니다.`
                  : `${member.nickname} 회원에게서 ${ifs(amountValue)}를 회수합니다.`}
            </p>
          ) : null
        }>
        {adjusting ? (
          <>
            <label className={fieldClass}>
              금액 (이프)
              <input
                ref={amountInput}
                className="control"
                type="number"
                inputMode="numeric"
                min={1}
                max={adjustBodyAmountMax}
                step={1}
                value={amount}
                disabled={pending}
                aria-invalid={amount !== '' && !parsedAmount.success}
                onChange={(event) => change(setAmount, event.target.value)}
              />
            </label>
            {amount !== '' && !parsedAmount.success ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                금액은 1~{adjustBodyAmountMax.toLocaleString('ko-KR')} 사이의
                정수로 입력해 주세요.
              </p>
            ) : null}
            {action === 'GRANT' ? (
              <>
                <label className={fieldClass}>
                  유효기간 (일)
                  <input
                    className="control"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={365}
                    step={1}
                    placeholder="30"
                    value={days}
                    disabled={pending}
                    aria-invalid={parsedDays !== null && !parsedDays.success}
                    onChange={(event) => change(setDays, event.target.value)}
                  />
                </label>
                <p
                  role={
                    parsedDays !== null && !parsedDays.success
                      ? 'alert'
                      : undefined
                  }
                  className={cn(
                    'mt-2 text-sm text-muted-foreground',
                    parsedDays !== null &&
                      !parsedDays.success &&
                      'text-destructive',
                  )}>
                  1~365일 사이로 입력해 주세요. 비우면 30일입니다.
                </p>
              </>
            ) : null}
          </>
        ) : null}
      </ReasonDialog>
    </>
  );
}
