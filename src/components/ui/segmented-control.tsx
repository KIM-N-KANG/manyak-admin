'use client';

import { useId } from 'react';

import { cn } from '@/lib/utils';

/** 라디오 묶음을 한 줄 세그먼트로 보여 주는 단일 선택 컨트롤. 화살표 키 이동은 브라우저 라디오 동작을 따른다. */
export function SegmentedControl<T extends string>({
  legend,
  value,
  options,
  onChange,
  className,
}: {
  legend: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const name = useId();

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-2 text-sm">{legend}</legend>
      <div className="inline-flex rounded-sm border bg-muted p-0.5">
        {options.map((option) => {
          const checked = option.value === value;

          return (
            <label
              key={option.value}
              className={cn(
                'flex h-8 cursor-pointer items-center rounded-[4px] px-4 text-sm transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-ring/50 motion-reduce:transition-none',
                checked
                  ? 'bg-card font-medium text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}>
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
