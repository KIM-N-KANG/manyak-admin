// @vitest-environment jsdom

import { createElement } from 'react';

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminShell } from '@/components/admin/admin-shell';

const navigation = vi.hoisted(() => ({ pathname: '/dashboard' }));

vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));
afterEach(cleanup);

const entries = [
  ['/dashboard', '개요'],
  ['/dashboard/analytics', '분석'],
  ['/members', '회원'],
  ['/stories', '스토리'],
  ['/originals', '오리지널'],
  ['/chats', '채팅방'],
  ['/payments', '결제'],
  ['/notices', '공지'],
  ['/audit-logs', '감사 로그'],
  ['/notifications/campaigns', '캠페인'],
  ['/notifications/stats', '발송 통계'],
  ['/notifications/templates', '문구 템플릿'],
] as const;

function shell(pathname: string) {
  navigation.pathname = pathname;

  return render(
    createElement(AdminShell, null, createElement('h1', null, '본문')),
  );
}

describe('관리자 메뉴 구조', () => {
  it('번호 없는 세 구역에 지정한 메뉴를 순서대로 배치한다', () => {
    shell('/dashboard');

    const nav = screen.getByRole('navigation', { name: '관리자 메뉴' });

    expect(
      within(nav)
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(['대시보드', '관리', '알림']);
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.getAttribute('href'), link.textContent]),
    ).toEqual(entries);
    expect(
      within(nav)
        .getByRole('region', { name: '대시보드' })
        .querySelectorAll('a'),
    ).toHaveLength(2);
    expect(
      within(nav).getByRole('region', { name: '관리' }).querySelectorAll('a'),
    ).toHaveLength(7);
    expect(
      within(nav).getByRole('region', { name: '알림' }).querySelectorAll('a'),
    ).toHaveLength(3);
    expect(
      screen.getByRole('link', { name: '마냑' }).getAttribute('href'),
    ).toBe('/dashboard');
  });

  it.each(entries)('%s는 %s 메뉴만 활성화한다', (pathname, label) => {
    shell(pathname);

    const active = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');

    expect(active).toHaveLength(1);
    expect(active[0].textContent).toBe(label);
  });

  it.each(
    entries.filter(([path]) =>
      ['/members', '/stories', '/chats', '/payments'].includes(path),
    ),
  )('%s 상세도 %s 메뉴를 활성화한다', (pathname, label) => {
    shell(`${pathname}/00000001-0000-4000-8000-000000000001`);

    const active = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');

    expect(active).toHaveLength(1);
    expect(active[0].textContent).toBe(label);
  });

  it('비슷한 접두사 경로를 활성 메뉴로 오인하지 않는다', () => {
    shell('/dashboard/analytics-other');
    expect(
      screen
        .getAllByRole('link')
        .some((link) => link.hasAttribute('aria-current')),
    ).toBe(false);
  });
});
