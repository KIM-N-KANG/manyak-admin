'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ManyakLogo } from '@/components/admin/manyak-logo';
import { cn } from '@/lib/utils';

const navigation = [
  {
    id: 'dashboard',
    title: '대시보드',
    items: [
      ['/dashboard', '개요'],
      ['/dashboard/analytics', '분석'],
    ],
  },
  {
    id: 'manage',
    title: '관리',
    items: [
      ['/members', '회원'],
      ['/stories', '스토리'],
      ['/originals', '오리지널'],
      ['/chats', '채팅방'],
      ['/payments', '결제'],
      ['/notices', '공지'],
      ['/audit-logs', '감사 로그'],
    ],
  },
  {
    id: 'notifications',
    title: '알림',
    items: [
      ['/notifications/campaigns', '캠페인'],
      ['/notifications/stats', '발송 통계'],
      ['/notifications/templates', '문구 템플릿'],
    ],
  },
] as const;

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
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center border-b px-6 py-7">
          <ManyakLogo className="shrink-0 text-primary" />
        </Link>
        <nav
          aria-label="관리자 메뉴"
          className="space-y-6 overflow-y-auto p-3 lg:py-6">
          {navigation.map((group) => (
            <section key={group.id} aria-labelledby={`nav-${group.id}`}>
              <h2
                id={`nav-${group.id}`}
                className="mb-2 px-3 text-xs font-medium text-muted-foreground">
                {group.title}
              </h2>
              <div className="flex flex-wrap gap-1 lg:flex-col">
                {group.items.map(([href, label]) => {
                  const active =
                    href === '/dashboard'
                      ? pathname === href
                      : pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-11 items-center rounded-sm px-3 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                        active &&
                          'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
                      )}>
                      {label}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
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
