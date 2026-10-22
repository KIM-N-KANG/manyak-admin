import { AuditLogDetailScreen } from '@/features/audit-logs/audit-log-screen';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AuditLogDetailScreen id={id} />;
}
