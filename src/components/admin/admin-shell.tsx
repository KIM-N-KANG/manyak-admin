'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const navigation = [
  ['/', '대시보드', '01'],
  ['/stories', '스토리', '02'],
  ['/members', '회원', '03'],
  ['/payments', '결제', '04'],
  ['/chats', '채팅방', '05'],
  ['/campaigns', '캠페인', '06'],
  ['/notices', '공지', '07'],
  ['/audit-logs', '감사 로그', '08'],
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-card focus:p-4">
        본문으로 이동
      </a>
      <aside className="border-b bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0">
        <Link href="/" className="flex items-center gap-3 border-b px-6 py-7">
          <span className="flex size-8 items-center justify-center rounded-sm bg-primary font-semibold text-primary-foreground">
            M
          </span>
          <span className="font-semibold tracking-tight">
            마냑{' '}
            <span className="font-mono text-xs font-normal text-muted-foreground">
              ADMIN
            </span>
          </span>
        </Link>
        <nav
          aria-label="관리자 메뉴"
          className="flex flex-wrap gap-1 p-3 lg:flex-col lg:py-6">
          {navigation.map(([href, label, number]) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                  active && 'bg-muted font-medium text-foreground',
                )}>
                <span className="font-mono text-xs text-foreground-secondary">
                  {number}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden border-t p-6 text-xs text-muted-foreground lg:block">
          <p className="mb-2 font-mono">MANYAK / OPERATIONS</p>
          <Link href="/login" className="hover:text-foreground hover:underline">
            로그인 화면 →
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex min-h-[89px] items-center justify-between gap-4 border-b bg-card px-6 lg:px-10">
          <p className="text-sm text-muted-foreground">
            워크스페이스 <span className="mx-3 text-border">/</span>
            <span className="text-foreground">서비스 운영</span>
          </p>
          <span className="rounded-sm border bg-muted px-2.5 py-1 font-mono text-xs">
            고정 데이터 미리보기
          </span>
        </header>
        <main id="content" className="mx-auto max-w-[1600px] p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
