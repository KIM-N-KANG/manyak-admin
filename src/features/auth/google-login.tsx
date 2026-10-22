'use client';

import { useRef, useState } from 'react';

import Script from 'next/script';

interface GoogleIdentity {
  initialize(options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select: boolean;
  }): void;
  renderButton(
    element: HTMLElement,
    options: { theme: string; size: string; width: number; text: string },
  ): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

export function GoogleLogin() {
  const container = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  async function login(credential: string) {
    if (inFlight.current) return;

    inFlight.current = true;
    setPending(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: credential }),
      });

      if (response.ok) {
        window.location.replace('/dashboard');

        return;
      }

      setMessage(
        response.status === 401 || response.status === 403
          ? '관리자 권한이 없는 계정입니다.'
          : '로그인에 실패했습니다. 잠시 후 다시 시도하세요.',
      );
    } catch {
      setMessage('서버에 연결할 수 없습니다. 다시 시도하세요.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function initialize() {
    if (!clientId || !container.current || !window.google) return;

    const identity = window.google.accounts.id;

    identity.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        void login(credential);
      },
      auto_select: false,
    });
    container.current.replaceChildren();
    identity.renderButton(container.current, {
      theme: 'outline',
      size: 'large',
      width: Math.max(200, Math.min(320, container.current.clientWidth)),
      text: 'continue_with',
    });
  }

  return (
    <div aria-busy={pending}>
      {clientId ? (
        <>
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
            onReady={initialize}
            onError={() =>
              setMessage('Google 로그인을 불러오지 못했습니다. 새로고침하세요.')
            }
          />
          <div
            ref={container}
            inert={pending}
            className={pending ? 'pointer-events-none opacity-50' : ''}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Google 로그인 설정이 필요합니다.
        </p>
      )}
      {pending && (
        <p role="status" className="mt-3 text-sm">
          로그인 중입니다.
        </p>
      )}
      {message && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
