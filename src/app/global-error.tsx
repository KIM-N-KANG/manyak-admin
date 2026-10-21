'use client';

import './globals.css';

import localFont from 'next/font/local';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const pretendard = localFont({
  src: '../assets/fonts/pretendard/PretendardVariable.woff2',
  variable: '--font-pretendard',
  weight: '45 920',
  display: 'swap',
});

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="bg-background font-sans text-foreground antialiased">
        <main className="flex min-h-dvh items-center justify-center px-6 py-16">
          <Card
            className="w-full max-w-md text-center"
            aria-labelledby="global-error-title">
            <h1 id="global-error-title" className="text-xl font-semibold">
              관리자 페이지를 열지 못했습니다
            </h1>
            <p className="mt-3 text-sm leading-6 text-foreground-secondary">
              잠시 후 다시 시도해 주세요.
            </p>
            <Button type="button" onClick={reset} className="mt-6">
              다시 시도
            </Button>
          </Card>
        </main>
      </body>
    </html>
  );
}
