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
  '/analytics/growth': {
    fallback: ['inflow', 'trend'],
    tabs: Object.fromEntries([
      ...[
        'trend',
        'activation',
        'creatives',
        'sources',
        'app',
        'push',
        'installs',
      ].map((tab) => [tab, ['inflow', tab] as const]),
      ...['activity', 'signups', 'retention'].map((tab) => [
        tab,
        ['audience', tab] as const,
      ]),
    ]),
  },
  '/analytics/stories': {
    fallback: ['content', 'making'],
    tabs: {
      making: ['content', 'making'],
      creation: ['inflow', 'creation'],
      'story-detail': ['inflow', 'story-detail'],
    },
  },
  '/analytics/payments': { fallback: ['revenue', ''], tabs: {} },
  '/analytics/acquisition': {
    fallback: ['inflow', 'trend'],
    tabs: {
      trend: ['inflow', 'trend'],
      creation: ['inflow', 'creation'],
      'story-detail': ['inflow', 'story-detail'],
      sources: ['inflow', 'sources'],
      push: ['inflow', 'push'],
      installs: ['inflow', 'installs'],
    },
  },
  '/analytics/users': {
    fallback: ['audience', 'activity'],
    tabs: {
      activity: ['audience', 'activity'],
      sessions: ['audience', 'activity'],
      retention: ['audience', 'retention'],
      signups: ['audience', 'signups'],
    },
  },
  '/analytics/conversion': {
    fallback: ['audience', 'signups'],
    tabs: {
      funnels: ['audience', 'signups'],
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

  if (tab) next.set('tab', tab);
  else next.delete('tab');

  if (
    pathname === '/dashboard/analytics' &&
    ['7', '30', '90'].includes(next.get('days') ?? '')
  ) {
    if (!next.has('range')) next.set('range', `last${next.get('days')}d`);

    next.delete('days');
  }

  const query = next.toString();

  return `/analytics/${domain}${query ? `?${query}` : ''}`;
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
