'use client';

import { type ReactNode, useId } from 'react';

import { Tooltip } from '@base-ui/react/tooltip';

export function HelpTooltip({
  label,
  children,
  source,
}: {
  label: string;
  children?: ReactNode;
  source?: string;
}) {
  const descriptionId = useId();

  return (
    <Tooltip.Provider delay={150}>
      <Tooltip.Root>
        <Tooltip.Trigger
          type="button"
          aria-label={label}
          aria-describedby={descriptionId}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-sm text-xs text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          {source ? <span className="pl-1">{source}</span> : null}
          <span
            aria-hidden="true"
            className="flex size-5 items-center justify-center rounded-full border text-xs">
            ?
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={8}>
            <Tooltip.Popup
              id={descriptionId}
              role="tooltip"
              className="z-50 max-w-80 rounded-sm border bg-popover p-3 text-xs leading-5 text-popover-foreground shadow-sm">
              {children}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
