'use client';

import { useEffect, useRef, useState } from 'react';

import { Popover } from '@base-ui/react/popover';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { popoverMotionClass } from '@/components/ui/popover-motion';

import type { DateRange, RangeName } from './date-range';
import {
  getRangeError,
  kstToday,
  quickRange,
  quickRanges,
  resolveRange,
} from './date-range';

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
  maxDays = 366,
  endDate,
  disabled = false,
}: {
  range: DateRange & {
    label: string;
    name: RangeName | null;
    select: (value: DateRange | RangeName) => void;
    query?: string;
  };
  maxDays?: number;
  endDate?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(range);
  const trigger = useRef<HTMLButtonElement>(null);
  const today = kstToday();
  const lastDate = endDate ?? today;
  const rangeError =
    getRangeError(draft, lastDate) ??
    ((Date.parse(draft.to) - Date.parse(draft.from)) / 86400000 >= maxDays
      ? `시작 날짜와 끝 날짜를 포함해 ${maxDays}일 이내로 선택해 주세요.`
      : null);

  return (
    <Popover.Root
      open={!disabled && open}
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
        disabled={disabled}
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
                    className="rounded-sm px-3 py-1.5 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                    aria-pressed={range.name === key}
                    disabled={
                      quickRange(key, today).to > lastDate ||
                      (Date.parse(quickRange(key, today).to) -
                        Date.parse(quickRange(key, today).from)) /
                        86400000 >=
                        maxDays
                    }
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

                  if (!rangeError) {
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
                    max={draft.to || lastDate}
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
                    max={lastDate}
                    value={draft.to}
                    onChange={(event) =>
                      setDraft({ ...draft, to: event.target.value })
                    }
                  />
                </label>
                <p className="max-w-56 text-xs text-muted-foreground">
                  끝 날짜는 {lastDate}까지 선택할 수 있으며 시작 날짜와 끝
                  날짜를 포함해 최대 {maxDays}일입니다.
                </p>
                {rangeError && (
                  <p role="alert" className="text-xs text-destructive">
                    {rangeError}
                  </p>
                )}
                <button
                  type="submit"
                  className="control"
                  disabled={!!rangeError}>
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
