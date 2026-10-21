import { Card } from '@/components/ui/card';

export default function Loading() {
  return (
    <main
      className="flex min-h-dvh items-center justify-center px-6 py-16"
      aria-busy="true">
      <Card className="w-full max-w-md text-center">
        <div
          className="mx-auto size-8 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none"
          aria-hidden="true"
        />
        <p role="status" className="mt-4 text-sm text-foreground-secondary">
          페이지를 불러오는 중입니다.
        </p>
      </Card>
    </main>
  );
}
