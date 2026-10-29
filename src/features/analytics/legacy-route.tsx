'use client';

import { useEffect } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const legacyRoutes: Record<
  string,
  {
    fallback: readonly [string, string];
    tabs: Record<string, readonly [string, string]>;
  }
> = {
  '/dashboard/analytics': { fallback: ['chats', 'engagement'], tabs: {} },
  '/analytics/acquisition': {
    fallback: ['growth', 'trend'],
    tabs: {
      trend: ['growth', 'trend'],
      creation: ['stories', 'creation'],
      'story-detail': ['stories', 'story-detail'],
      sources: ['growth', 'sources'],
      push: ['growth', 'push'],
      installs: ['growth', 'installs'],
    },
  },
  '/analytics/users': {
    fallback: ['growth', 'activity'],
    tabs: {
      activity: ['growth', 'activity'],
      sessions: ['growth', 'activity'],
      retention: ['growth', 'retention'],
      signups: ['growth', 'signups'],
    },
  },
  '/analytics/conversion': {
    fallback: ['growth', 'signups'],
    tabs: {
      funnels: ['growth', 'signups'],
      'turn-reach': ['chats', 'engagement'],
    },
  },
  '/analytics/quality': {
    fallback: ['ops', 'ai-quality'],
    tabs: {
      client: ['ops', 'ai-quality'],
      'chat-options': ['chats', 'chat-options'],
      'ai-cost': ['ops', 'ai-cost'],
    },
  },
  '/analytics/infra': {
    fallback: ['ops', 'services'],
    tabs: {
      services: ['ops', 'services'],
      storage: ['ops', 'storage'],
      tables: ['ops', 'tables'],
    },
  },
};

export function legacyHref(pathname: string, params: URLSearchParams) {
  const mapping = legacyRoutes[pathname];
  const requested = params.get('tab') ?? '';
  const [domain, tab] = Object.hasOwn(mapping.tabs, requested)
    ? mapping.tabs[requested]
    : mapping.fallback;
  const next = new URLSearchParams(params);

  next.set('tab', tab);

  if (
    pathname === '/dashboard/analytics' &&
    ['7', '30', '90'].includes(next.get('days') ?? '')
  ) {
    if (!next.has('range')) next.set('range', `last${next.get('days')}d`);

    next.delete('days');
  }

  return `/analytics/${domain}?${next}`;
}

export function LegacyRoute() {
  const params = useSearchParams(),
    pathname = usePathname(),
    router = useRouter();
  const href = legacyHref(pathname, new URLSearchParams(params));

  useEffect(() => {
    router.replace(href, { scroll: false });
  }, [href, router]);

  return null;
}
