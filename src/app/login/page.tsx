import { ManyakLogo } from '@/components/admin/manyak-logo';
import { Card } from '@/components/ui/card';
import { GoogleLogin } from '@/features/auth/google-login';

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <Card className="w-full max-w-[420px] p-6 sm:p-10">
        <ManyakLogo className="mb-8 block text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">관리자 로그인</h1>
        <p className="mt-3 mb-8 text-sm leading-6 text-muted-foreground">
          마냑 서비스 운영을 위한 공간입니다.
          <br />
          관리자 Google 계정으로 로그인하세요.
        </p>
        <GoogleLogin />
      </Card>
    </main>
  );
}
