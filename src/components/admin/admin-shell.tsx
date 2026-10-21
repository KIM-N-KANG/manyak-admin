'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ManyakLogo } from '@/components/admin/manyak-logo';
import { cn } from '@/lib/utils';

const navigation = [
  ['/', '대시보드'],
  ['/stories', '스토리'],
  ['/members', '회원'],
  ['/payments', '결제'],
  ['/chats', '채팅방'],
  ['/campaigns', '캠페인'],
  ['/notices', '공지'],
  ['/audit-logs', '감사 로그'],
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
        <Link href="/" className="flex items-center border-b px-6 py-7">
          <ManyakLogo className="shrink-0 text-primary" />
        </Link>
        <nav
          aria-label="관리자 메뉴"
          className="flex flex-wrap gap-1 p-3 lg:flex-col lg:py-6">
          {navigation.map(([href, label]) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                  active &&
                    'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
                )}>
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main
        id="content"
        className="mx-auto w-full max-w-[1600px] min-w-0 p-6 lg:p-10">
        {children}
      </main>
    </div>
  );
}
