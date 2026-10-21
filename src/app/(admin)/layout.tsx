import type { ReactNode } from 'react';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { isFixturePreview } from '@/features/auth/preview';
import { readSession, sessionCookie } from '@/features/auth/session';

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

  return <AdminShell nickname={session.nickname}>{children}</AdminShell>;
}
