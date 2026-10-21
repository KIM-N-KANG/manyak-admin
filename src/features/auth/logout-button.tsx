'use client';

import { useState } from 'react';

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
      <Button variant="outline" disabled={pending} onClick={logout}>
        {pending ? '로그아웃 중' : '로그아웃'}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          로그아웃에 실패했습니다. 다시 시도하세요.
        </p>
      )}
    </>
  );
}
