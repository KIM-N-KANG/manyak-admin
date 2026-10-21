import type { MemberSummary } from '@/features/shared/types';

export type AuditLog = {
  auditLogId: string;
  admin: MemberSummary;
  category: 'CHANGE' | 'ACCESS';
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  requestId: string;
  createdAt: string;
};
