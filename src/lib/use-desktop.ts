import { useSyncExternalStore } from 'react';

const desktopQuery = '(min-width: 1024px)';

function subscribe(listener: () => void) {
  const media = window.matchMedia?.(desktopQuery);

  media?.addEventListener('change', listener);

  return () => media?.removeEventListener('change', listener);
}

const desktopSnapshot = () =>
  window.matchMedia?.(desktopQuery).matches ?? false;
const serverSnapshot = () => false;

/** 데스크톱(1024px 이상) 너비인지 반환한다. 서버와 matchMedia가 없는 환경은 모바일로 본다. */
export function useDesktop() {
  return useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
}
