import type { ComponentProps } from 'react';

export function SectionSwitch({
  label,
  ...props
}: Omit<ComponentProps<'input'>, 'type' | 'role' | 'aria-label'> & {
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm has-disabled:cursor-default has-disabled:opacity-50">
      <input
        {...props}
        type="checkbox"
        role="switch"
        aria-label={label}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="inline-flex h-5 w-9 items-center rounded-full border bg-muted p-0.5 transition-colors peer-checked:bg-primary-text peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 motion-reduce:transition-none peer-checked:[&>span]:translate-x-4">
        <span className="size-3.5 rounded-full bg-card shadow-sm transition-transform motion-reduce:transition-none" />
      </span>
      <span className="sr-only">{label}</span>
    </label>
  );
}
