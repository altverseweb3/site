// Types for analytics data
export interface PeriodicUserStatsItem {
  period_start: string;
  new_users: number;
  active_users: number;
}

export interface PeriodicActivityStatsItem {
  period_start: string;
  swap_count: number;
  lending_count: number;
  earn_count: number;
  dapp_entrances: number;
  active_users: number;
}

export interface PeriodicSwapStatsItem {
  period_start: string;
  total_swap_count: number;
  swap_routes: Record<string, number>;
  cross_chain_count: number;
  same_chain_count: number;
}

export interface PeriodicLendingBreakdown {
  chain: string;
  market: string;
  count: number;
}

export interface PeriodicLendingStatsItem {
  period_start: string;
  total_lending_count: number;
  breakdown: PeriodicLendingBreakdown[];
}

export interface PeriodicEarnStatsItem {
  period_start: string;
  total_earn_count: number;
  by_chain: Record<string, number>;
  by_protocol: Record<string, number>;
  by_chain_protocol: Record<string, number>;
}

export interface PeriodicStats {
  periodic_user_stats: PeriodicUserStatsItem[];
  periodic_activity_stats: PeriodicActivityStatsItem[];
  periodic_swap_stats: PeriodicSwapStatsItem[];
  periodic_lending_stats: PeriodicLendingStatsItem[];
  periodic_earn_stats: PeriodicEarnStatsItem[];
}

export interface AnalyticsData {
  total_users: { total_users: number };
  total_activity_stats: {
    total_transactions: number;
    swap_count: number;
    lending_count: number;
    earn_count: number;
    dapp_entrances: number;
    total_users: number;
  };
  total_swap_stats: {
    total_swap_count: number;
    swap_routes: Record<string, number>;
    cross_chain_count: number;
    same_chain_count: number;
  };
  total_lending_stats: {
    total_lending_count: number;
    breakdown: Array<{ chain: string; market: string; count: number }>;
  };
  total_earn_stats: {
    total_earn_count: number;
    by_chain: Record<string, number>;
    by_protocol: Record<string, number>;
  };
  periodic_stats: {
    daily?: PeriodicStats;
    weekly?: PeriodicStats;
    monthly?: PeriodicStats;
  };
}

export type TimePeriod = "last7" | "last30" | "weekly" | "monthly";
export type TabType = "users" | "activity" | "swaps" | "lending" | "earn";
