export type DashboardSummary = {
  asOf: string;
  todayStartsAt: string;
  members: {
    total: number;
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
export type ChartPoint = { label: string; value: number; link: ChartLink };
export type Distribution = {
  chartId: string;
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

export type DashboardAnalytics = {
  asOf: string;
  from: string;
  to: string;
  todayActiveUsers: number;
  daily: { date: string; activeUsers: number; newUsers: number }[];
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
    activeDevices: number;
  }[];
}
