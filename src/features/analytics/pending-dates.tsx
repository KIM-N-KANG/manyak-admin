'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useState,
} from 'react';

const PendingContext = createContext<
  ((id: string, dates: string[] | null) => void) | null
>(null);

export function PendingNotice({ dates }: { dates: string[] }) {
  return dates.length ? (
    <div role="status" className="mb-5 rounded-md border p-4 text-sm">
      준비 중 날짜 {dates.length}개. 60초 뒤 다시 요청합니다.
      <details className="mt-2 text-xs">
        <summary>준비 중 날짜</summary>
        <p className="mt-2">{dates.join(', ')}</p>
      </details>
    </div>
  ) : null;
}

/** 각 응답의 준비 중 날짜를 모아 탭 맨 위에 알림 하나를 표시한다. */
export function PendingTab({ children }: { children: ReactNode }) {
  const [responses, setResponses] = useState<Record<string, string[]>>({});
  const [register] = useState(() => (id: string, dates: string[] | null) => {
    setResponses((previous) => {
      const next = { ...previous };

      if (dates === null) delete next[id];
      else next[id] = dates;

      return next;
    });
  });
  const dates = [...new Set(Object.values(responses).flat())].sort();

  return (
    <PendingContext value={register}>
      <PendingNotice dates={dates} />
      {children}
    </PendingContext>
  );
}

export function PendingDates({ dates }: { dates: string[] }) {
  const register = useContext(PendingContext);
  const id = useId();
  const serialized = JSON.stringify(dates);

  useEffect(() => {
    if (!register) return;

    register(id, JSON.parse(serialized));

    return () => register(id, null);
  }, [id, register, serialized]);

  return register ? null : <PendingNotice dates={dates} />;
}
