// 관리자 OpenAPI 응답을 화면에서 사용하는 타입이다.
export type CampaignDefinition = {
  key: string;
  name: string;
  campaign: string;
  startDate: string;
  endDate: string | null;
  storyId: string | null;
};
export type CampaignSegments = { all: number; ads: number; nonAds: number };
export type CampaignSources = {
  ads: number;
  instagram: number;
  threads: number;
  dcinside: number;
  other: number;
};
export type CampaignDay = {
  date: string;
  activeUsers: number;
  newVisitors: CampaignSegments;
  newVisitorsBySource: CampaignSources;
  newVisitorsByDevice?: { ios: number; android: number; other: number };
  signups: CampaignSegments;
  cumulativeSignups: CampaignSegments;
  /** 서버 배포 전 응답에는 없다. */
  androidSignups?: number;
  storylineRequests: number;
  completionRequests: number;
  chatMessages: number;
};
export type CampaignTotals = {
  newVisitorsByDevice?: { ios: number; android: number; other: number };
  activeUsersAverage: number;
  newVisitors: CampaignSegments;
  signups: CampaignSegments;
  androidSignups?: number;
  adsShare: number | null;
  storylineRequests: number;
  completionRequests: number;
  chatMessages: number;
};
export type CampaignAnalyticsResponse = {
  asOf: string;
  from: string;
  to: string;
  campaign: string;
  daily: CampaignDay[];
  totals: CampaignTotals;
  pendingDates: string[];
};
export type CampaignFunnelStep = { event: string; users: CampaignSegments };
export type CampaignCreationResponse = {
  asOf: string;
  from: string;
  to: string;
  campaign: string;
  steps: CampaignFunnelStep[];
};
export type StoryCampaignStep = {
  event: string;
  turnNumber: number | null;
  users: number;
};
export type CampaignStoryResponse = {
  asOf: string;
  from: string;
  to: string;
  campaign: string;
  storyId: string;
  steps: StoryCampaignStep[];
};
export type CampaignSourceRow = { source: string | null; newVisitors: number };
export type CampaignPostRow = { content: string | null; visitors: number };
export type CampaignSourceResponse = {
  asOf: string;
  from: string;
  to: string;
  sources: CampaignSourceRow[];
  posts: CampaignPostRow[];
};
export type PlatformCounts = {
  all: number;
  web: number;
  android: number;
  unknown: number;
};
export type PlatformDecimals = {
  all: number | null;
  web: number | null;
  android: number | null;
  unknown: number | null;
};
/** 플랫폼 없음이 없는 가입과 채팅 시작 등의 플랫폼 값이다. */
export type MetricPlatformCounts = Pick<
  PlatformCounts,
  'all' | 'web' | 'android'
>;
export type MetricPlatformRates = Pick<
  PlatformDecimals,
  'all' | 'web' | 'android'
>;
export type ActivityDay = {
  date: string;
  activeUsers: PlatformCounts;
  newVisitors: PlatformCounts;
  cumulativeNewVisitors: PlatformCounts;
  messagesPerUser: PlatformDecimals;
};
export type ActivityResponse = {
  asOf: string;
  from: string;
  to: string;
  monthlyActiveUsers: number | null;
  daily: ActivityDay[];
  pendingDates: string[];
};
export type RetentionRates = {
  d1: number | null;
  d2: number | null;
  d3: number | null;
  d4: number | null;
  d5: number | null;
  d6: number | null;
  d7: number | null;
  d30: number | null;
};
export type RetentionCohort = {
  date: string;
  users: number;
  d1: number | null;
  d2: number | null;
  d3: number | null;
  d4: number | null;
  d5: number | null;
  d6: number | null;
  d7: number | null;
  d30: number | null;
};
export type RetentionPlatform = {
  platform: string;
  cohorts: RetentionCohort[];
  summary: RetentionRates;
};
export type RetentionResponse = {
  cohort?: 'visitor' | 'signup' | 'first-chat';
  asOf: string;
  from: string;
  to: string;
  platforms: RetentionPlatform[];
  pendingDates: string[];
};
export type SessionDay = {
  date: string;
  averageSessionSeconds: PlatformDecimals;
  sessionsPerUser?: PlatformDecimals;
};
export type SessionResponse = {
  asOf: string;
  from: string;
  to: string;
  segment?: string;
  daily: SessionDay[];
  pendingDates: string[];
};
export type QualityDay = {
  date: string;
  activity?: {
    aiResponses: number;
    simpleCompletions: number;
    generalSubmissions: number;
    coreActiveUsers: number;
    messagesPerCoreUser: number | null;
    simpleCompletionsPerCoreUser: number | null;
  };
  messagesByInputMode: Record<string, number>;
  streamErrors: number;
  streamErrorRate: number | null;
  users: Record<string, number>;
};
export type QualityResponse = {
  storyCompletion?: {
    date: string;
    requests: number;
    failed: number;
    failureRate: number | null;
  }[];
  asOf: string;
  from: string;
  to: string;
  platform: string;
  segment?: string;
  daily: QualityDay[];
  pendingDates: string[];
};
export type ConversionStep = {
  minTurnNumber?: number | null;
  platform?: string | null;
  event: string;
  turnNumber: number | null;
  users: number;
};
export type ConversionResponse = {
  asOf: string;
  from: string;
  to: string;
  funnel: string;
  platform: string | null;
  storyId: string | null;
  steps: ConversionStep[];
};
export type ReachPoint = { turn: number; chats: number; rate: number };
export type ReachSegment = {
  segment: string;
  chats: number;
  reached: ReachPoint[];
};
export type GuestConversion = {
  chatsReached5: number;
  chatsReached6: number;
  rate: number;
};
export type ReachPlatform = {
  platform: string;
  chats: number;
  reached: ReachPoint[];
};

/** Amplitude 플랫폼 값의 공통 필드다. 서버 배포 전 응답에는 없어 선택 필드로 둔다. */
type PlatformMeta = { platformAsOf?: string | null; pendingDates?: string[] };

export type TurnReachResponse = PlatformMeta & {
  asOf: string;
  from: string;
  to: string;
  segment?: string;
  segments: ReachSegment[];
  guestToMember: GuestConversion;
  platforms?: ReachPlatform[] | null;
};
export type SignupCounts = { total: number; google: number; kakao: number };
export type SignupDay = {
  date: string;
  signups: SignupCounts;
  cumulativeSignups: number;
  migratedFromGuest: number;
  signupsByPlatform?: MetricPlatformCounts | null;
  newVisitorsByPlatform?: MetricPlatformCounts | null;
  signupRate?: MetricPlatformRates | null;
};
export type SignupResponse = PlatformMeta & {
  asOf: string;
  from: string;
  to: string;
  daily: SignupDay[];
};
export type ChatOptionDay = {
  date: string;
  chats: number;
  withPersona: number;
  byModel: Record<string, number>;
  turnsByModel: Record<string, number>;
  chatStarters?: MetricPlatformCounts | null;
  chatStartersByPersonaType?: Record<
    'default' | 'persona' | 'none',
    MetricPlatformCounts
  > | null;
  chatStarts?: PlatformCounts | null;
  personaChatStarts?: PlatformCounts | null;
  platformTurnsByModel?: Record<string, MetricPlatformCounts> | null;
};
export type ChatOptionResponse = PlatformMeta & {
  asOf: string;
  from: string;
  to: string;
  segment?: string;
  daily: ChatOptionDay[];
};
export type AiCostDay = { date: string; byFeature: AiCostItem[] };
export type AiCostItem = {
  feature: string;
  model: string | null;
  calls: number;
  callsWithoutTokens: number;
  inputTokens: number;
  outputTokens: number;
  costKrw: number | null;
};
export type AiCostResponse = {
  expiredDates: string[];
  retentionDays: number;
  retentionStartDate: string;
  pendingDates: string[];
  usdKrwRate: number;
  unmapped: { traceName: string; costKrw: number }[];
  chatImageUnitCostKrw: number;
  asOf: string | null;
  from: string;
  to: string;
  currency: string;
  daily: AiCostDay[];
  totals: AiCostTotals;
  unpricedModels: string[];
};
export type AiCostTotals = {
  costKrw: number;
  costPerTurnKrw: number | null;
  costPerStoryKrw: number | null;
};

export type NotificationOpenState =
  | 'MEASURED'
  | 'BEFORE_MEASUREMENT'
  | 'NO_LINK'
  | 'PENDING';
export type NotificationOpenValues = {
  openState: NotificationOpenState;
  pushOpens: number | null;
  webPushOpens: number | null;
  androidPushOpens: number | null;
  pushOpenRate: number | null;
  inboxOpens: number | null;
  webInboxOpens: number | null;
  androidInboxOpens: number | null;
};
export type PushOpensResponse = {
  asOf: string | null;
  pendingDates: string[];
  from: string;
  to: string;
  measuredFrom: string | null;
  androidMeasuredFrom: string | null;
  campaigns: (NotificationOpenValues & {
    campaignId: string;
    kind: 'SERVICE' | 'MARKETING';
    title: string;
    noticeId: string | null;
    startedAt: string;
    deliveredMembers: number;
  })[];
  activityFrom: string | null;
  activityTypes: (Omit<NotificationOpenValues, 'openState'> & {
    openState: 'MEASURED' | 'BEFORE_MEASUREMENT';
    type:
      | 'STORY_COMPLETED'
      | 'STORY_MODERATION_COMPLETED'
      | 'ATTENDANCE_REMINDER'
      | 'CREDIT_EXPIRY_REMINDER';
    deliveredMembers: number;
  })[];
};
export type CampaignOpensResponse = NotificationOpenValues & {
  asOf: string | null;
  pendingDates: string[];
  campaignId: string;
  startedAt: string | null;
  from: string | null;
  to: string | null;
  measuredFrom: string | null;
  androidMeasuredFrom: string | null;
  deliveredMembers: number;
};

export type SessionLengthResponse = {
  daily?: {
    date: string;
    sessions: Pick<PlatformCounts, 'all' | 'web' | 'android'>;
  }[];
  asOf: string;
  from: string;
  to: string;
  segment: string;
  pendingDates: string[];
  bins: { fromSeconds: number; toSeconds: number }[];
  platforms: {
    platform: string;
    sessions: number[];
    totalSessions: number;
    medianBin: number | null;
  }[];
};

export type MetricPeriod = {
  asOf: string;
  from: string;
  to: string;
  pendingDates: string[];
};
export type CampaignActivationResponse = Omit<MetricPeriod, 'pendingDates'> & {
  campaign: string;
  steps: {
    event: string;
    minTurnNumber: number | null;
    users: CampaignSegments;
  }[];
};
export type CampaignReachResponse = Omit<MetricPeriod, 'pendingDates'> & {
  campaign: string;
  chatUsers: CampaignSegments;
  deepChatUsers: CampaignSegments;
};
export type CreativeUsers = { content: string | null; users: number };
export type CampaignCreativesResponse = MetricPeriod & {
  campaign: string;
  daily: {
    date: string;
    signups: CreativeUsers[];
    deepChatUsers: CreativeUsers[];
  }[];
  totals: { signups: CreativeUsers[] };
};
export type InstallSourceUsers = { source: string | null; users: number };
export type AppTransferResponse = MetricPeriod & {
  daily: {
    date: string;
    bannerShown: number;
    bannerClicked: number;
    bannerClickRate: number | null;
    bannerNewUsers: number;
    newUsersBySource: InstallSourceUsers[];
  }[];
  totals: { bannerNewUsers: number; newUsersBySource: InstallSourceUsers[] };
};
export type AppActivationResponse = MetricPeriod & {
  daily: {
    date: string;
    newUsers: number;
    activeUsers: number;
    activationRate: number | null;
  }[];
  totals: {
    newUsers: number;
    activeUsers: number;
    activationRate: number | null;
  };
};
