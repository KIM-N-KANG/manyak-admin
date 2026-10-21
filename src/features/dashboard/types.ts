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
export type ChartPoint = { label: string; value: number; href: string };
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
