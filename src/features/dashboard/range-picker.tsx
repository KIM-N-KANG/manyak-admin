'use client';

import { useEffect, useRef, useState } from 'react';

import { Popover } from '@base-ui/react/popover';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { popoverMotionClass } from '@/components/ui/popover-motion';

import type { DateRange, RangeName } from './date-range';
import { kstToday, quickRanges, resolveRange, validRange } from './date-range';

export function useDashboardRange() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const range = resolveRange(new URLSearchParams(params));
  const query = new URLSearchParams({
    from: range.from,
    to: range.to,
  }).toString();

  useEffect(() => {
    if (!params.has('days')) return;

    const next = new URLSearchParams(params);

    next.delete('days');
    next.delete('from');
    next.delete('to');
    next.set('range', range.name ?? 'last30d');
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [params, pathname, router, range.name]);

  function select(value: DateRange | RangeName) {
    const next = new URLSearchParams(params);

    for (const key of ['days', 'range', 'from', 'to']) next.delete(key);

    if (typeof value === 'string') next.set('range', value);
    else {
      next.set('from', value.from);
      next.set('to', value.to);
    }

    router.push(`${pathname}?${next}`, { scroll: false });
  }

  return { ...range, query, select };
}
export function RangePicker({
  range,
}: {
  range: ReturnType<typeof useDashboardRange>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(range);
  const trigger = useRef<HTMLButtonElement>(null);
  const today = kstToday();

  return (
    <Popover.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);

        if (value) setDraft(range);
      }}
      onOpenChangeComplete={(value) => {
        if (!value)
          queueMicrotask(() => trigger.current?.focus({ preventScroll: true }));
      }}>
      <Popover.Trigger
        ref={trigger}
        className="control"
        aria-label={`기간: ${range.label}`}>
        {range.label} ▾
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50">
          <Popover.Popup
            finalFocus={trigger}
            className={`${popoverMotionClass} max-h-[80vh] max-w-[calc(100vw-24px)] overflow-auto rounded-md border bg-card p-4 shadow-md`}>
            <Popover.Title className="mb-3 font-semibold">
              기간 선택 (KST)
            </Popover.Title>
            <div className="flex flex-wrap gap-6">
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-1">
                {quickRanges.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="rounded-sm px-3 py-1.5 text-left text-sm hover:bg-muted"
                    aria-pressed={range.name === key}
                    onClick={() => {
                      range.select(key);
                      setOpen(false);
                    }}>
                    {label}
                  </button>
                ))}
              </div>
              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();

                  if (validRange(draft, today)) {
                    range.select(draft);
                    setOpen(false);
                  }
                }}>
                <label className="text-sm">
                  시작 날짜
                  <input
                    className="control mt-1 block"
                    type="date"
                    required
                    max={draft.to || today}
                    value={draft.from}
                    onChange={(event) =>
                      setDraft({ ...draft, from: event.target.value })
                    }
                  />
                </label>
                <label className="text-sm">
                  끝 날짜
                  <input
                    className="control mt-1 block"
                    type="date"
                    required
                    min={draft.from}
                    max={today}
                    value={draft.to}
                    onChange={(event) =>
                      setDraft({ ...draft, to: event.target.value })
                    }
                  />
                </label>
                <p className="max-w-56 text-xs text-muted-foreground">
                  오늘까지 최대 366일을 선택할 수 있습니다.
                </p>
                {!validRange(draft, today) && (
                  <p role="alert" className="text-xs text-destructive">
                    날짜 순서와 최대 366일 범위를 확인하세요.
                  </p>
                )}
                <button
                  type="submit"
                  className="control"
                  disabled={!validRange(draft, today)}>
                  적용
                </button>
              </form>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
