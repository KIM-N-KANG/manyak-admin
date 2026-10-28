export type DashboardSummary = {
  asOf: string;
  todayStartsAt: string;
  members: {
    total: number;
    active: number;
    withdrawn: number;
    joinedToday: number;
  };
  chats: {
    startedTotal: number;
    startedToday: number;
    turnsTotal: number;
    turnsToday: number;
  };
  stories: { total: number; createdToday: number };
  credits: {
    grantedTotal: number;
    grantedToday: number;
    spentTotal: number;
    spentToday: number;
  };
  payments: {
    completedTotal: number;
    completedToday: number;
    amountKrwTotal: number;
    amountKrwToday: number;
  };
};
export type DailyMetrics = {
  date: string;
  joined: number;
  chats: number;
  turns: number;
  stories: number;
  granted: number;
  spent: number;
  payments: number;
  revenue: number;
  attendance: number;
};
export type MetricKey = Exclude<keyof DailyMetrics, 'date'>;
export type ChartLink = {
  list: 'stories' | 'chats' | 'members';
  params: Record<string, string>;
};
export type ChartPoint = {
  label: string;
  value: number;
  link: ChartLink;
  chats?: number | null;
  users?: number | null;
  totalTurns?: number | null;
};
export type Distribution = {
  chartId: string;
  category: 'users' | 'engagement' | 'content' | 'ai-quality';
  title: string;
  description: string;
  unit: string;
  points: ChartPoint[];
};
export type DashboardCharts = {
  asOf: string;
  from: string;
  to: string;
  daily: DailyMetrics[];
  distributions: Distribution[];
};

export type DashboardPlatformCounts = {
  total: number;
  web: number;
  android: number;
};

export type DashboardAnalytics = {
  asOf: string;
  from: string;
  to: string;
  todayActiveUsers: DashboardPlatformCounts | null;
  pendingDates: string[];
  daily: {
    date: string;
    activeUsers: DashboardPlatformCounts;
    newUsers: DashboardPlatformCounts;
  }[];
};

export interface PlayInstalls {
  totalInstalls: number;
  activeDevices: number;
  asOf: string;
  daily: {
    date: string;
    installs: number;
    uninstalls: number;
    cumulativeInstalls: number;
    activeDevices: number | null;
  }[];
}
