'use client';

import { Tabs as BaseTabs } from '@base-ui/react/tabs';

import { cn } from '@/lib/utils';

function Tab({ className, ...props }: BaseTabs.Tab.Props) {
  return (
    <BaseTabs.Tab
      {...props}
      className={(state) =>
        cn(
          'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          typeof className === 'function' ? className(state) : className,
        )
      }
    />
  );
}

function Panel(props: BaseTabs.Panel.Props) {
  // 각 패널의 대화형 자식으로 탭 이동하며 패널 자체는 포커스하지 않는다.
  return <BaseTabs.Panel {...props} tabIndex={undefined} />;
}

export const Tabs = { Root: BaseTabs.Root, List: BaseTabs.List, Tab, Panel };
