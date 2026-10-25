'use client';

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { Dialog } from '@base-ui/react/dialog';
import { z } from 'zod';

import { Button } from '@/components/ui/button';

export const reasonSchema = z.string().trim().min(1).max(500);

/** 표 위 한 줄로 보이고 4초 뒤 사라지는 성공 알림. */
export function SuccessNotice({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);

    return () => clearTimeout(timer);
  }, []);

  return visible ? (
    <p role="status" className="mb-4 text-sm text-primary-text">
      {message}
    </p>
  ) : null;
}

/** 처리 사유를 받고 처리 중에는 닫히지 않는 확인 대화상자. */
export function ReasonDialog({
  open,
  title,
  description,
  reason,
  onReasonChange,
  pending,
  error,
  canConfirm = true,
  initialFocus,
  finalFocus,
  onClose,
  onConfirm,
  children,
  summary,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  reason: string;
  onReasonChange: (value: string) => void;
  pending: boolean;
  error: string;
  canConfirm?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  finalFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
  onConfirm: () => void;
  children?: ReactNode;
  summary?: ReactNode;
}) {
  const input = useRef<HTMLTextAreaElement | null>(null);
  const errorId = useId();
  const valid = reasonSchema.safeParse(reason).success;
  const reasonInvalid = reason.length > 0 && !valid;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next, details) => {
        if (pending) {
          details.cancel();

          return;
        }

        if (!next) onClose();
      }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Popup
          initialFocus={initialFocus ?? input}
          finalFocus={finalFocus}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-3rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-card p-6 shadow-lg">
          <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-4 text-sm leading-6 text-muted-foreground">
            {description}
          </Dialog.Description>
          {children}
          <label className="mt-5 flex flex-col gap-2 text-sm">
            처리 사유
            <textarea
              ref={input}
              className="control min-h-24"
              value={reason}
              disabled={pending}
              maxLength={500}
              aria-invalid={Boolean(error) || reasonInvalid}
              aria-describedby={error || reasonInvalid ? errorId : undefined}
              onChange={(event) => onReasonChange(event.target.value)}
            />
          </label>
          {error || reasonInvalid ? (
            <p
              id={errorId}
              role="alert"
              className="mt-2 text-sm text-destructive">
              {error || '처리 사유를 입력해 주세요.'}
            </p>
          ) : null}
          {summary}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" disabled={pending} onClick={onClose}>
              취소
            </Button>
            <Button
              disabled={!valid || !canConfirm || pending}
              onClick={onConfirm}>
              {pending ? '처리 중…' : '확인'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
