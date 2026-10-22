'use client';

import { createContext, type ReactNode, useContext } from 'react';

export const ServerDataContext = createContext(false);
export const useServerData = () => useContext(ServerDataContext);

export function ServerDataProvider({
  value,
  children,
}: {
  value: boolean;
  children?: ReactNode;
}) {
  return <ServerDataContext value={value}>{children}</ServerDataContext>;
}
