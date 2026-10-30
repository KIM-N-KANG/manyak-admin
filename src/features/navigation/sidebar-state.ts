export const navigation = [
  {
    id: 'dashboard',
    title: '대시보드',
    items: [
      ['/dashboard', '개요'],
      ['/analytics/growth', '성장'],
      ['/analytics/stories', '스토리'],
      ['/analytics/chats', '채팅'],
      ['/analytics/payments', '결제'],
      ['/analytics/ops', '운영'],
    ],
  },
  {
    id: 'manage',
    title: '관리',
    items: [
      ['/members', '회원'],
      ['/stories', '스토리'],
      ['/moderation/submissions', '검수 제출'],
      ['/originals', '오리지널'],
      ['/chats', '채팅'],
      ['/payments', '결제'],
      ['/credits/transactions', '이프'],
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

export type SidebarGroup = (typeof navigation)[number]['id'];
export type SidebarPreferences = Record<SidebarGroup, boolean>;
export const sidebarStorageKey = 'manyak-admin:sidebar:v1';
export const closedSidebar: SidebarPreferences = {
  dashboard: false,
  manage: false,
  notifications: false,
};

export function isMenuActive(pathname: string, href: string) {
  if (href === '/credits/transactions')
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname === '/credits/promotions' ||
      pathname.startsWith('/credits/promotions/')
    );

  return href === '/dashboard'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}
/** 지표 화면 메뉴에 지금 URL의 `platform`, `segment`, `campaign`을 붙인다. 기간과 그 밖의 조건은 붙이지 않는다. */
export function menuHref(href: string, search: Pick<URLSearchParams, 'get'>) {
  if (!href.startsWith('/analytics/')) return href;

  const kept = new URLSearchParams();

  for (const key of ['platform', 'segment', 'campaign']) {
    const value = search.get(key);

    if (value) kept.set(key, value);
  }

  const query = kept.toString();

  return query ? `${href}?${query}` : href;
}
export function currentSidebarGroup(pathname: string): SidebarGroup | null {
  return (
    navigation.find((group) =>
      group.items.some(([href]) => isMenuActive(pathname, href)),
    )?.id ?? null
  );
}
export function parseSidebarState(raw: string | null): SidebarPreferences {
  try {
    const value: unknown = JSON.parse(raw ?? '{}');

    if (!value || typeof value !== 'object' || Array.isArray(value))
      return { ...closedSidebar };

    return Object.fromEntries(
      Object.keys(closedSidebar).map((key) => [
        key,
        (value as Record<string, unknown>)[key] === true,
      ]),
    ) as SidebarPreferences;
  } catch {
    return { ...closedSidebar };
  }
}
export function expandedSidebar(
  pathname: string,
  stored: SidebarPreferences,
): SidebarPreferences {
  const current = currentSidebarGroup(pathname);

  return { ...stored, ...(current ? { [current]: true } : {}) };
}
export function saveSidebarState(
  storage: Pick<Storage, 'setItem'>,
  value: SidebarPreferences,
) {
  try {
    storage.setItem(
      sidebarStorageKey,
      JSON.stringify({
        dashboard: value.dashboard,
        manage: value.manage,
        notifications: value.notifications,
      }),
    );

    return true;
  } catch {
    return false;
  }
}
