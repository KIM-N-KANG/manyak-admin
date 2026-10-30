export type NotificationKind = 'SERVICE' | 'MARKETING';
export type CampaignStatus =
  | 'SCHEDULED'
  | 'SENDING'
  | 'SENT'
  | 'CANCELED'
  | 'FAILED';
export type Campaign = {
  campaignId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  scheduledAt: string;
  status: CampaignStatus;
  failureReason: string | null;
  noticeId: string | null;
  storyId?: string | null;
  targetCount: number | null;
  sentCount: number | null;
  deliveredMembers: number;
  deliveredDevices: number;
  failedDevices: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};
export type TargetCount = {
  kind: NotificationKind;
  targetCount: number;
  nightEligibleCount: number | null;
  nightNow: boolean;
  asOf: string;
};
export const templateKeys = [
  'attendance_reminder',
  'credit_expiry_reminder',
] as const;
export type TemplateKey = (typeof templateKeys)[number];
export type Template = {
  templateKey: string;
  effective: { title: string; body: string; isDefault: boolean };
  overrides: {
    title: string;
    body: string;
    effectiveFrom: string;
    effectiveUntil: string | null;
    active: boolean;
  }[];
};
export const notificationTypes = [
  'STORY_COMPLETED',
  'STORY_MODERATION_COMPLETED',
  'NOTICE',
  'ATTENDANCE_REMINDER',
  'CREDIT_EXPIRY_REMINDER',
  'PROMOTION',
] as const;
export type DeliveryRow = {
  date: string;
  type: (typeof notificationTypes)[number];
  kind: NotificationKind;
  requested: number;
  deliveredMembers: number;
  deliveredDevices: number;
  failedDevices: number;
};
export type DeliveryStats = { from: string; to: string; items: DeliveryRow[] };

export type CampaignCreateRequest = {
  title: string;
  body: string;
  reason: string;
  scheduledAt?: string;
  storyId?: string;
  noticeId?: string;
};
