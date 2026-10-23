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
  signups: CampaignSegments;
  cumulativeSignups: CampaignSegments;
  storylineRequests: number;
  completionRequests: number;
  chatMessages: number;
};
export type CampaignTotals = {
  activeUsersAverage: number;
  newVisitors: CampaignSegments;
  signups: CampaignSegments;
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
  d7: number | null;
  d30: number | null;
};
export type RetentionCohort = {
  date: string;
  users: number;
  d1: number | null;
  d7: number | null;
  d30: number | null;
};
export type RetentionPlatform = {
  platform: string;
  cohorts: RetentionCohort[];
  summary: RetentionRates;
};
export type RetentionResponse = {
  asOf: string;
  from: string;
  to: string;
  platforms: RetentionPlatform[];
  pendingDates: string[];
};
export type SessionDay = {
  date: string;
  averageSessionSeconds: PlatformDecimals;
};
export type SessionResponse = {
  asOf: string;
  from: string;
  to: string;
  daily: SessionDay[];
  pendingDates: string[];
};
export type QualityDay = {
  date: string;
  messagesByInputMode: Record<string, number>;
  streamErrors: number;
  streamErrorRate: number | null;
  users: Record<string, number>;
};
export type QualityResponse = {
  asOf: string;
  from: string;
  to: string;
  platform: string;
  daily: QualityDay[];
  pendingDates: string[];
};
export type ConversionStep = {
  event: string;
  turnNumber: number | null;
  users: number;
};
export type ConversionResponse = {
  asOf: string;
  from: string;
  to: string;
  funnel: string;
  platform: string;
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
export type TurnReachResponse = {
  asOf: string;
  from: string;
  to: string;
  segments: ReachSegment[];
  guestToMember: GuestConversion;
};
export type SignupCounts = {
  total: number;
  google: number;
  kakao: number;
  other: number;
};
export type SignupDay = {
  date: string;
  signups: SignupCounts;
  cumulativeSignups: number;
  migratedFromGuest: number;
};
export type SignupResponse = {
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
};
export type ChatOptionResponse = {
  asOf: string;
  from: string;
  to: string;
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
  pendingDates: string[];
  usdKrwRate: number;
  unmapped: { traceName: string; costKrw: number }[];
  chatImageUnitCostKrw: number;
  asOf: string;
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
