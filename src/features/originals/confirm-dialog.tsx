'use client';

import type { ReactNode, RefObject } from 'react';

import { Dialog } from '@base-ui/react/dialog';

import { Button } from '@/components/ui/button';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  pending,
  onConfirm,
  error,
  children,
  canConfirm = true,
  confirmLabel = '확인',
  confirmVariant,
  initialFocus,
  finalFocus,
}: {
  children?: ReactNode;
  canConfirm?: boolean;
  confirmLabel?: string;
  confirmVariant?: 'destructive';
  initialFocus?: RefObject<HTMLElement | null>;
  finalFocus?: RefObject<HTMLElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  error?: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value, details) => {
        if (pending) details.cancel();
        else onOpenChange(value);
      }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Popup
          initialFocus={initialFocus}
          finalFocus={finalFocus}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-3rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-md border bg-card p-6 shadow-lg">
          {/* 짧은 화면에서는 내용만 스크롤해 버튼 줄이 화면 밖으로 밀리지 않게 한다. */}
          <div className="min-h-0 overflow-y-auto">
            <Dialog.Title className="text-xl font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Description className="mt-4 text-sm leading-6 text-muted-foreground">
              {description}
            </Dialog.Description>
            {children}
            {error ? (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <div className="mt-6 flex shrink-0 justify-end gap-2">
            <Dialog.Close
              render={<Button variant="outline" disabled={pending} />}>
              취소
            </Dialog.Close>
            <Button
              variant={confirmVariant}
              disabled={pending || !canConfirm}
              onClick={onConfirm}>
              {pending ? '처리 중…' : confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
