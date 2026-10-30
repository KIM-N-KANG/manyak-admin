'use client';

import { type RefObject, useId, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { customInstance, FetchError } from '@/api/mutator/custom-instance';
import { ConfirmDialog } from '@/features/originals/confirm-dialog';

import {
  promotionFormSchema,
  type PromotionModel,
  promotionReasonForm,
  promotionRequest,
  utcToKst,
} from './promotions';

export function PromotionDialog({
  model,
  action,
  trigger,
  onClose,
}: {
  model: PromotionModel;
  action: 'set' | 'remove';
  trigger: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const [form, setForm] = useState({
    turnCost: model.promotion?.turnCost.toString() ?? '',
    startsAt: model.promotion ? utcToKst(model.promotion.startsAt) : '',
    endsAt: model.promotion ? utcToKst(model.promotion.endsAt) : '',
    reason: '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const setting = action === 'set';
  const validation = setting
    ? promotionFormSchema.safeParse(form)
    : promotionReasonForm.safeParse(form.reason);
  const issues = validation.success ? [] : validation.error.issues;

  function fieldError(field: string) {
    return issues.find((issue) =>
      setting ? issue.path[0] === field : field === 'reason',
    )?.message;
  }

  function change(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function confirm() {
    if (!validation.success || pending) return;

    setPending(true);
    setError('');

    try {
      await customInstance(
        `/api/credits/promotions/${encodeURIComponent(model.code)}`,
        {
          method: setting ? 'PUT' : 'DELETE',
          body: JSON.stringify(
            setting
              ? promotionRequest(form)
              : { reason: promotionReasonForm.parse(form.reason) },
          ),
        },
      );
      onClose();
      await client.invalidateQueries({
        queryKey: ['/api/credits/promotions'],
        exact: true,
      });
    } catch (failure) {
      setError(
        failure instanceof FetchError &&
          failure.data &&
          typeof failure.data === 'object' &&
          'message' in failure.data &&
          typeof failure.data.message === 'string'
          ? failure.data.message
          : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`${model.name} 프로모션 ${setting ? '설정' : '해제'}`}
      description={
        !setting && model.promotion?.status === 'ACTIVE'
          ? '진행 중인 프로모션이 지금 끝납니다.'
          : ''
      }
      pending={pending}
      error={error}
      canConfirm={validation.success}
      confirmLabel={setting ? '저장' : '확인'}
      initialFocus={reasonInput}
      finalFocus={trigger}
      onConfirm={confirm}>
      <fieldset disabled={pending} className="mt-5 space-y-4 text-sm">
        {setting
          ? (['turnCost', 'startsAt', 'endsAt'] as const).map((field) => (
              <div key={field}>
                <label
                  className="flex flex-col gap-2"
                  htmlFor={`${id}-${field}`}>
                  {field === 'turnCost'
                    ? '프로모션 가격 (이프)'
                    : field === 'startsAt'
                      ? '시작 (KST)'
                      : '종료 (KST)'}
                  <input
                    id={`${id}-${field}`}
                    className="control w-full"
                    type={field === 'turnCost' ? 'number' : 'datetime-local'}
                    min={field === 'turnCost' ? 0 : undefined}
                    max={field === 'turnCost' ? 10000 : undefined}
                    step={field === 'turnCost' ? 1 : 60}
                    value={form[field]}
                    aria-invalid={Boolean(fieldError(field))}
                    aria-describedby={
                      fieldError(field) ? `${id}-${field}-error` : undefined
                    }
                    onChange={(event) => change(field, event.target.value)}
                  />
                </label>
                {fieldError(field) ? (
                  <p
                    id={`${id}-${field}-error`}
                    role="alert"
                    className="mt-1 text-destructive">
                    {fieldError(field)}
                  </p>
                ) : null}
              </div>
            ))
          : null}
        <label className="flex flex-col gap-2" htmlFor={`${id}-reason`}>
          사유
          <textarea
            id={`${id}-reason`}
            ref={reasonInput}
            className="control min-h-24 w-full"
            value={form.reason}
            maxLength={500}
            aria-invalid={Boolean(fieldError('reason'))}
            aria-describedby={
              fieldError('reason') ? `${id}-reason-error` : undefined
            }
            onChange={(event) => change('reason', event.target.value)}
          />
        </label>
        {fieldError('reason') ? (
          <p
            id={`${id}-reason-error`}
            role="alert"
            className="text-destructive">
            {fieldError('reason')}
          </p>
        ) : null}
      </fieldset>
    </ConfirmDialog>
  );
}
