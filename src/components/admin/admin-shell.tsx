'use client';

import { type ReactNode, useState, useSyncExternalStore } from 'react';

import { Dialog } from '@base-ui/react/dialog';
import {
  DashboardSquare01Icon,
  Menu01Icon,
  Notification03Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { ExternalToolsPopover } from '@/components/admin/external-tools-popover';
import { ManyakLogo } from '@/components/admin/manyak-logo';
import { LogoutButton } from '@/features/auth/logout-button';
import {
  currentSidebarGroup,
  expandedSidebar,
  isMenuActive,
  menuHref,
  navigation,
  parseSidebarState,
  saveSidebarState,
  type SidebarGroup,
  type SidebarPreferences,
  sidebarStorageKey,
} from '@/features/navigation/sidebar-state';
import { useDesktop } from '@/lib/use-desktop';
import { cn } from '@/lib/utils';

const sidebarEvent = 'manyak-sidebar-change';
const groupIcons = {
  dashboard: DashboardSquare01Icon,
  manage: Settings01Icon,
  notifications: Notification03Icon,
  ops: Settings01Icon,
};

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(sidebarEvent, listener);

  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(sidebarEvent, listener);
  };
}

function snapshot() {
  try {
    return window.localStorage.getItem(sidebarStorageKey);
  } catch {
    return null;
  }
}

const serverSnapshot = () => null;

export function AdminShell({
  children,
  nickname,
  preview = false,
}: {
  children?: ReactNode;
  nickname?: string;
  preview?: boolean;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [fallback, setFallback] = useState<SidebarPreferences | null>(null);
  const stored = fallback ?? parseSidebarState(raw);
  const expanded = expandedSidebar(pathname, stored);
  const current = currentSidebarGroup(pathname);
  const name = nickname || '관리자';
  const desktop = useDesktop();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function toggle(group: SidebarGroup) {
    if (group === current) return;

    const next = { ...stored, [group]: !expanded[group] };
    let saved = false;

    try {
      saved = saveSidebarState(window.localStorage, next);
    } catch {
      saved = false;
    }

    setFallback(saved ? null : next);

    if (saved) window.dispatchEvent(new Event(sidebarEvent));
  }

  /** 데스크톱 사이드바와 모바일 서랍이 함께 쓰는 메뉴와 하단 영역을 그린다. */
  function sidebar(prefix: string, onNavigate?: () => void) {
    return (
      <>
        <nav
          aria-label="관리자 메뉴"
          className="space-y-6 overflow-y-auto p-3 lg:py-6">
          {navigation.map((group) => (
            <section key={group.id}>
              <h2>
                <button
                  type="button"
                  id={`${prefix}-${group.id}`}
                  aria-expanded={expanded[group.id]}
                  aria-controls={`${prefix}-${group.id}-items`}
                  onClick={() => toggle(group.id)}
                  title={
                    group.id === current
                      ? '현재 페이지 구역은 펼친 상태로 유지됩니다.'
                      : undefined
                  }
                  className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 text-left text-sm font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:min-h-9">
                  <HugeiconsIcon
                    icon={groupIcons[group.id]}
                    size={20}
                    aria-hidden="true"
                    className="shrink-0 text-primary"
                  />
                  {group.title}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'ml-auto transition-transform duration-150 motion-reduce:transition-none',
                      expanded[group.id] && 'rotate-90',
                    )}>
                    ▸
                  </span>
                </button>
              </h2>
              <div
                id={`${prefix}-${group.id}-items`}
                role="region"
                aria-labelledby={`${prefix}-${group.id}`}
                aria-hidden={!expanded[group.id]}
                inert={!expanded[group.id]}
                className={cn(
                  'grid transition-[grid-template-rows] duration-150 motion-reduce:transition-none',
                  expanded[group.id] ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}>
                <div className="min-h-0 overflow-hidden">
                  <div className="my-1 ml-5 flex flex-col gap-1 border-l pl-3">
                    {group.items.map(([href, label]) => (
                      <Link
                        key={href}
                        href={menuHref(href, search)}
                        onClick={onNavigate}
                        aria-current={
                          isMenuActive(pathname, href) ? 'page' : undefined
                        }
                        className={cn(
                          'flex min-h-10 items-center rounded-sm px-3 text-sm font-normal text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                          isMenuActive(pathname, href) &&
                            'bg-sidebar-accent text-sidebar-accent-foreground',
                        )}>
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </nav>
        <div className="mt-auto shrink-0 border-t p-4">
          <ExternalToolsPopover />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-2">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
              {Array.from(name)[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              {preview && (
                <p className="truncate text-xs text-muted-foreground">
                  고정 데이터 미리보기
                </p>
              )}
            </div>
            {!preview && <LogoutButton />}
          </div>
          {process.env.APP_VERSION_LABEL && (
            <p className="mt-3 px-2 font-mono text-[11px] text-muted-foreground/70">
              {process.env.APP_VERSION_LABEL}
            </p>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-card focus:p-4">
        본문으로 이동
      </a>
      <Dialog.Root open={drawerOpen && !desktop} onOpenChange={setDrawerOpen}>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-1 border-b bg-sidebar px-2 lg:hidden">
          <Dialog.Trigger
            aria-label="관리자 메뉴"
            className="flex size-11 shrink-0 items-center justify-center rounded-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground">
            <HugeiconsIcon icon={Menu01Icon} size={22} aria-hidden="true" />
          </Dialog.Trigger>
          <Link
            href="/dashboard"
            onClick={() => setDrawerOpen(false)}
            className="flex min-h-11 items-center px-2">
            <ManyakLogo className="shrink-0 text-primary" />
          </Link>
        </header>
        <Dialog.Portal>
          {/* 상단 바(z-40)는 배경 위에 남겨 햄버거 버튼 재클릭으로도 닫히게 한다. */}
          <Dialog.Backdrop className="fixed inset-x-0 top-14 bottom-0 z-30 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none lg:hidden" />
          <Dialog.Popup className="fixed top-14 bottom-0 left-0 z-30 flex w-72 max-w-[calc(100vw-3rem)] flex-col overflow-y-auto overscroll-contain border-r bg-sidebar transition-transform duration-200 ease-out outline-none data-ending-style:-translate-x-full data-starting-style:-translate-x-full motion-reduce:transition-none lg:hidden">
            <Dialog.Title className="sr-only">관리자 메뉴</Dialog.Title>
            {sidebar('drawer-nav', () => setDrawerOpen(false))}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <aside className="hidden bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center justify-center border-b px-6 py-5">
          <ManyakLogo className="shrink-0 text-primary" />
        </Link>
        {sidebar('nav')}
      </aside>
      <main
        id="content"
        className="mx-auto w-full max-w-[1600px] min-w-0 p-6 lg:p-10">
        {children}
      </main>
    </div>
  );
}
