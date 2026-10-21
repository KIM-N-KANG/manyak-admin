import { Card } from '@/components/ui/card';

export default function Page() {
  return (
    <>
      <h1 className="mb-8 text-[32px] font-semibold tracking-tight">캠페인</h1>
      <Card className="py-24 text-center">
        <h2 className="text-lg font-semibold">준비 중입니다</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          캠페인 관리 기능은 다음 업데이트에서 제공됩니다.
        </p>
      </Card>
    </>
  );
}
