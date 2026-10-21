import Link from 'next/link';

import { ManyakBrand } from '@/components/admin/manyak-brand';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <Card className="w-full max-w-[420px] p-10">
        <ManyakBrand className="mb-8" />
        <h1 className="text-2xl font-semibold tracking-tight">관리자 로그인</h1>
        <p className="mt-3 mb-8 text-sm leading-6 text-muted-foreground">
          마냑 서비스 운영을 위한 공간입니다.
          <br />
          관리자 Google 계정으로 로그인하세요.
        </p>
        <Button disabled className="w-full" variant="outline">
          <span aria-hidden="true" className="font-semibold">
            G
          </span>
          Google로 계속하기
        </Button>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          로그인 기능은 준비 중입니다.
        </p>
        <Link
          className="mt-8 inline-block text-sm text-link hover:underline"
          href="/">
          화면 미리보기 →
        </Link>
      </Card>
    </main>
  );
}
