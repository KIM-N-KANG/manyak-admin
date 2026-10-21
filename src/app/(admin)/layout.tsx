import type { ReactNode } from 'react';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { readSession, sessionCookie } from '@/features/auth/session';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = readSession((await cookies()).get(sessionCookie)?.value);

  if (!session) redirect('/login');

  return <AdminShell nickname={session.nickname}>{children}</AdminShell>;
}
