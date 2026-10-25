'use client';

import { type ReactNode, useState, useSyncExternalStore } from 'react';

import {
  DashboardSquare01Icon,
  Notification03Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ExternalToolsPopover } from '@/components/admin/external-tools-popover';
import { ManyakLogo } from '@/components/admin/manyak-logo';
import { LogoutButton } from '@/features/auth/logout-button';
import {
  currentSidebarGroup,
  expandedSidebar,
  isMenuActive,
  navigation,
  parseSidebarState,
  saveSidebarState,
  type SidebarGroup,
  type SidebarPreferences,
  sidebarStorageKey,
} from '@/features/navigation/sidebar-state';
import { cn } from '@/lib/utils';

const sidebarEvent = 'manyak-sidebar-change';
const groupIcons = {
  dashboard: DashboardSquare01Icon,
  manage: Settings01Icon,
  notifications: Notification03Icon,
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
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [fallback, setFallback] = useState<SidebarPreferences | null>(null);
  const stored = fallback ?? parseSidebarState(raw);
  const expanded = expandedSidebar(pathname, stored);
  const current = currentSidebarGroup(pathname);
  const name = nickname || '관리자';

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
          className="flex shrink-0 items-center justify-center border-b px-6 py-5">
          <ManyakLogo className="shrink-0 text-primary" />
        </Link>
        <nav
          aria-label="관리자 메뉴"
          className="space-y-6 overflow-y-auto p-3 lg:py-6">
          {navigation.map((group) => (
            <section key={group.id}>
              <h2>
                <button
                  type="button"
                  id={`nav-${group.id}`}
                  aria-expanded={expanded[group.id]}
                  aria-controls={`nav-${group.id}-items`}
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
                id={`nav-${group.id}-items`}
                role="region"
                aria-labelledby={`nav-${group.id}`}
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
                        href={href}
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
      </aside>
      <main
        id="content"
        className="mx-auto w-full max-w-[1600px] min-w-0 p-6 lg:p-10">
        {children}
      </main>
    </div>
  );
}
