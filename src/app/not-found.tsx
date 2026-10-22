import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <Card
        className="w-full max-w-md text-center"
        aria-labelledby="not-found-title">
        <p className="font-mono text-sm text-foreground-secondary">404</p>
        <h1 id="not-found-title" className="mt-3 text-xl font-semibold">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mt-3 text-sm leading-6 text-foreground-secondary">
          주소를 확인하거나 관리자 홈으로 이동해 주세요.
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/" />}
          className="mt-6">
          관리자 홈으로
        </Button>
      </Card>
    </main>
  );
}
