import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-6 py-16 sm:px-8">
      <header className="space-y-3">
        <p className="font-mono text-xs tracking-wider text-foreground-secondary">
          MANYAK ADMIN
        </p>
        <h1 className="text-[32px] leading-10 font-semibold tracking-[-1.28px]">
          마냑 관리자
        </h1>
        <p className="text-base leading-6 text-foreground-secondary">
          관리자 화면을 위한 기본 구성입니다.
        </p>
      </header>
      <div className="grid gap-6 sm:grid-cols-2">
        <Card aria-labelledby="buttons-heading">
          <h2
            id="buttons-heading"
            className="text-xl leading-7 font-semibold tracking-[-0.4px]">
            버튼
          </h2>
          <p className="mt-2 text-sm leading-5 text-foreground-secondary">
            기본 색상과 테두리 스타일
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button">기본 버튼</Button>
            <Button type="button" variant="outline">
              보조 버튼
            </Button>
            <Button type="button" disabled>
              비활성
            </Button>
          </div>
        </Card>
        <Card aria-labelledby="surface-heading">
          <h2
            id="surface-heading"
            className="text-xl leading-7 font-semibold tracking-[-0.4px]">
            카드
          </h2>
          <p className="mt-2 text-sm leading-5 text-foreground-secondary">
            밝은 배경, 얇은 테두리, Pretendard 글꼴
          </p>
          <div className="mt-6 rounded-sm bg-muted p-4 text-sm text-muted-foreground">
            콘텐츠 영역
          </div>
        </Card>
      </div>
    </main>
  );
}
