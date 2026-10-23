import type { PlayInstalls } from '@/features/dashboard/types';

let cumulative = 0;
let active = 0;
const daily = Array.from({ length: 47 }, (_, index) => {
  const installs = index % 3 === 0 ? 2 : index % 4 === 0 ? 1 : 0;
  const uninstalls = index % 5 === 0 ? 1 : 0;

  cumulative += installs;
  active += installs - uninstalls;

  return {
    date: new Date(Date.UTC(2026, 8, 1 + index)).toISOString().slice(0, 10),
    installs,
    uninstalls,
    cumulativeInstalls: cumulative,
    activeDevices: active,
  };
});

export const playInstalls: PlayInstalls = {
  totalInstalls: cumulative,
  activeDevices: active,
  asOf: daily.at(-1)!.date,
  daily,
};
