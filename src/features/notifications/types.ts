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
  noticeId: string | null;
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
