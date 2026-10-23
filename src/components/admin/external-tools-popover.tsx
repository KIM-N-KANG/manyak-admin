'use client';

import { useRef, useSyncExternalStore } from 'react';

import { Popover } from '@base-ui/react/popover';

import { ExternalToolLink } from '@/components/admin/external-tool-link';
import { popoverMotionClass } from '@/components/ui/popover-motion';
import { externalLinks } from '@/lib/external-links';
import { cn } from '@/lib/utils';

const desktopQuery = '(min-width: 1024px)';

function subscribe(listener: () => void) {
  const media = window.matchMedia?.(desktopQuery);

  media?.addEventListener('change', listener);

  return () => media?.removeEventListener('change', listener);
}

const desktopSnapshot = () =>
  window.matchMedia?.(desktopQuery).matches ?? false;
const serverSnapshot = () => false;

export function ExternalToolsPopover() {
  const desktop = useSyncExternalStore(
    subscribe,
    desktopSnapshot,
    serverSnapshot,
  );
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <section className="mb-4">
      <Popover.Root
        onOpenChangeComplete={(open) => {
          // 바깥의 포커스 가능한 요소를 눌러도 닫힘 뒤에는 버튼으로 복귀한다.
          if (!open)
            queueMicrotask(() =>
              trigger.current?.focus({ preventScroll: true }),
            );
        }}>
        <h2>
          <Popover.Trigger
            ref={trigger}
            className="flex min-h-11 w-full items-center gap-3 rounded-sm px-2 text-left text-sm font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground data-popup-open:hover:bg-sidebar-accent lg:min-h-9">
            외부 도구
            <span aria-hidden="true" className="ml-auto">
              {desktop ? '▸' : '▾'}
            </span>
          </Popover.Trigger>
        </h2>
        <Popover.Portal>
          <Popover.Positioner
            side={desktop ? 'right' : 'bottom'}
            align={desktop ? 'end' : 'start'}
            sideOffset={12}
            collisionPadding={12}
            className="z-50">
            <Popover.Popup
              finalFocus={trigger}
              className={cn(
                popoverMotionClass,
                'w-56 max-w-[calc(100vw-24px)] rounded-md border bg-card p-2 shadow-md',
              )}>
              <Popover.Title className="sr-only">외부 도구</Popover.Title>
              {(
                [
                  ['amplitude', 'Amplitude'],
                  ['openSearch', 'OpenSearch 로그'],
                  ['sentry', 'Sentry'],
                  ['langfuse', 'Langfuse'],
                  ['groble', '그로블'],
                ] as const
              ).map(([key, label]) => (
                <ExternalToolLink
                  key={key}
                  href={externalLinks[key]}
                  className="flex px-3 text-muted-foreground hover:bg-muted">
                  {label}
                </ExternalToolLink>
              ))}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </section>
  );
}
