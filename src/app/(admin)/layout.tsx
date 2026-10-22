import type { ReactNode } from 'react';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { isFixturePreview, isServerMode } from '@/features/auth/preview';
import { readSession, sessionCookie } from '@/features/auth/session';
import { ServerDataProvider } from '@/features/shared/data-source';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (isFixturePreview())
    return (
      <AdminShell nickname="미리보기" preview>
        {children}
      </AdminShell>
    );

  const session = readSession((await cookies()).get(sessionCookie)?.value);

  if (!session) redirect('/login');

  return (
    <ServerDataProvider value={isServerMode()}>
      <AdminShell nickname={session.nickname}>{children}</AdminShell>
    </ServerDataProvider>
  );
}
