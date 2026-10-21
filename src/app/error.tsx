'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ reset }: ErrorProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <Card
        className="w-full max-w-md text-center"
        aria-labelledby="error-title">
        <h1 id="error-title" className="text-xl font-semibold">
          화면을 불러오지 못했습니다
        </h1>
        <p className="mt-3 text-sm leading-6 text-foreground-secondary">
          잠시 후 다시 시도해 주세요.
        </p>
        <Button type="button" onClick={reset} className="mt-6">
          다시 시도
        </Button>
      </Card>
    </main>
  );
}
