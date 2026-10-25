'use client';

import { useState } from 'react';

import { Logout01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function logout() {
    setPending(true);
    setError(false);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });

      if (!response.ok) throw new Error();

      window.google?.accounts.id.disableAutoSelect();
      window.location.replace('/login');
    } catch {
      setPending(false);
      setError(true);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        aria-label={pending ? '로그아웃 중' : '로그아웃'}
        title="로그아웃"
        disabled={pending}
        onClick={logout}
        className="size-9 px-0 text-muted-foreground hover:text-foreground">
        <HugeiconsIcon icon={Logout01Icon} size={18} aria-hidden="true" />
      </Button>
      {error && (
        <p role="alert" className="basis-full text-xs text-destructive">
          로그아웃에 실패했습니다. 다시 시도하세요.
        </p>
      )}
    </>
  );
}
