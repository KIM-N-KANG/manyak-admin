// 관리자 OpenAPI의 신규 지표 응답 필드를 사용하는 화면 타입이다.
export type PaymentMetrics = {
  asOf: string;
  from: string;
  to: string;
  activeMembers: number;
  payingMembers: number;
  conversionRate: number | null;
  orders: number;
  amountKrw: number;
  arppu: number | null;
  firstTime: { orders: number; amountKrw: number };
  repeat: { orders: number; amountKrw: number };
  products: {
    productId: string;
    orders: number;
    amountKrw: number;
    creditAmount: number;
  }[];
  refundedOrders: number;
  refundRate: number | null;
  daysToFirstPayment: { bucket: string; members: number }[];
};
export type CreditMetrics = {
  asOf: string;
  from: string;
  to: string;
  granted: number;
  spent: number;
  sinkRate: number | null;
  grantedByReason: { reason: string; amount: number }[];
  spentByReason: { reason: string; amount: number }[];
  balances: {
    members: number;
    total: number;
    buckets: { bucket: string; members: number }[];
    purchased: number;
    rewarded: number;
    legacy: number;
    expiringIn30Days: number;
  };
};
export type StoryConsumption = {
  asOf: string;
  from: string;
  to: string;
  publicStories: number;
  officialStories: number;
  playedStories: number;
  playedRate: number | null;
  otherMemberChats: number;
  topConcentration: number | null;
  ranking: {
    storyId: string;
    title: string;
    official: boolean;
    deleted: boolean;
    chats: number;
    players: number;
    turns: number;
  }[];
  creators: {
    activeMembers: number;
    members: number;
    rate: number | null;
    previousMembers: number;
    retained: number;
    retentionRate: number | null;
  };
};
export type ChatEngagement = {
  asOf: string;
  from: string;
  to: string;
  activeMembers: number;
  monthlyActiveMembers: number;
  turnsPerActiveMember: number | null;
  daily: {
    date: string;
    activeMembers: number;
    turns: number;
    turnsPerActiveMember: number | null;
    continuedMembers: number;
    continuationRate: number | null;
    regenerations: number;
    regenerationRate: number | null;
    stickiness: number | null;
  }[];
};
export type ModerationMetrics = {
  asOf: string;
  from: string;
  to: string;
  decided: number;
  approved: number;
  rejected: number;
  rejectionRate: number | null;
  failed: number;
  held: number;
  pending: number;
  daily: {
    date: string;
    submitted: number;
    approved: number;
    rejected: number;
    failed: number;
  }[];
  rejectionRules: { rule: string; type: string; submissions: number }[];
};
