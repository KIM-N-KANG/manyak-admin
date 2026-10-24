export const navigation = [
  {
    id: 'dashboard',
    title: '대시보드',
    items: [
      ['/dashboard', '개요'],
      ['/dashboard/analytics', '분석'],
      ['/analytics/acquisition', '유입'],
      ['/analytics/users', '사용자'],
      ['/analytics/conversion', '전환'],
      ['/analytics/quality', '기능과 품질'],
      ['/analytics/infra', '인프라'],
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
  return href === '/dashboard'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
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
