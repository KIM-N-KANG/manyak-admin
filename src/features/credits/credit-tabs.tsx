'use client';

import type { ReactNode } from 'react';

import { useRouter } from 'next/navigation';

import { Tabs } from '@/components/ui/tabs';

export function CreditTabs({
  value,
  children,
}: {
  value: 'transactions' | 'promotions';
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <Tabs.Root
      value={value}
      onValueChange={(next) => router.push(`/credits/${next}`)}>
      <Tabs.List
        aria-label="이프"
        className="mb-5 flex overflow-x-auto border-b">
        {[
          ['transactions', '이프 내역'],
          ['promotions', '프로모션'],
        ].map(([key, label]) => (
          <Tabs.Tab
            key={key}
            value={key}
            className="shrink-0 border-b-2 border-transparent px-4 py-3 text-sm text-muted-foreground data-active:border-primary data-active:text-primary-text">
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <Tabs.Panel value={value}>{children}</Tabs.Panel>
    </Tabs.Root>
  );
}
