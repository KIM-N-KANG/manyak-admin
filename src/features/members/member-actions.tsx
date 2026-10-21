'use client';

import { useState } from 'react';

import { Dialog } from '@base-ui/react/dialog';

import { Button } from '@/components/ui/button';

export function MemberActions({ nickname }: { nickname: string }) {
  const [action, setAction] = useState<string | null>(null);

  return (
    <Dialog.Root
      open={action !== null}
      onOpenChange={(open) => {
        if (!open) setAction(null);
      }}>
      <div className="flex flex-wrap gap-2">
        {['이프 지급', '이프 회수', '계정 정지'].map((label) => (
          <Button
            key={label}
            variant={label === '계정 정지' ? 'destructive' : 'outline'}
            onClick={() => setAction(label)}>
            {label}
          </Button>
        ))}
      </div>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-3rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-card p-6 shadow-lg">
          <Dialog.Title className="text-xl font-semibold">
            {action} 확인
          </Dialog.Title>
          <Dialog.Description className="mt-4 text-sm leading-6 text-muted-foreground">
            {nickname} 회원의 {action} 작업을 선택했습니다. 실제 처리 기능은
            준비 중이며 이 화면에서는 실행되지 않습니다.
          </Dialog.Description>
          <div className="mt-6 flex justify-end">
            <Dialog.Close render={<Button variant="outline" />}>
              확인하고 닫기
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
