"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/Chart";
import { AnalyticsData, PeriodicStats, TimePeriod } from "@/types/analytics";

interface UsersTabProps {
  data: AnalyticsData;
  periodicStats: PeriodicStats | null;
  formatDate: (dateStr: string, period: TimePeriod) => string;
  timePeriod: TimePeriod;
}

export function UsersTab({
  data,
  periodicStats,
  formatDate,
  timePeriod,
}: UsersTabProps) {
  const [activeMetric, setActiveMetric] = React.useState<
    "new_users" | "active_users"
  >("new_users");

  const chartConfig = {
    new_users: {
      label: "New Users",
      color: "hsl(30 80% 55%)",
    },
    active_users: {
      label: "Active Users",
      color: "hsl(35 85% 60%)",
    },
  } satisfies ChartConfig;

  const chartData =
    periodicStats?.periodic_user_stats.map((item) => ({
      period: item.period_start,
      new_users: item.new_users,
      active_users: item.active_users,
    })) || [];

  const total = React.useMemo(
    () => ({
      new_users:
        periodicStats?.periodic_user_stats.reduce(
          (acc, item) => acc + item.new_users,
          0,
        ) || 0,
      active_users: Math.max(
        ...(periodicStats?.periodic_user_stats.map(
          (item) => item.active_users,
        ) || [0]),
      ),
    }),
    [periodicStats],
  );

  return (
    <div className="space-y-6">
      {/* Interactive Area Chart with Toggle */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader className="flex flex-col items-stretch border-b border-[#27272A] p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
            <CardTitle>User Metrics - Interactive</CardTitle>
            <CardDescription>
              {activeMetric === "new_users"
                ? "New users acquired"
                : "Peak active users"}{" "}
              across selected period
            </CardDescription>
          </div>
          <div className="flex">
            {(["new_users", "active_users"] as const).map((key) => (
              <button
                key={key}
                data-active={activeMetric === key}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l border-[#27272A] sm:border-t-0 sm:px-8 sm:py-6"
                onClick={() => setActiveMetric(key)}
              >
                <span className="text-xs text-muted-foreground">
                  {chartConfig[key].label}
                </span>
                <span className="text-lg font-bold leading-none sm:text-3xl text-[hsl(30_80%_55%)]">
                  {total[key].toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[300px] w-full"
          >
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 12, right: 12 }}
            >
              <defs>
                <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(30 80% 55%)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(30 80% 55%)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#27272A" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => formatDate(value, timePeriod)}
              />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    nameKey="users"
                    labelFormatter={(value) => formatDate(value, timePeriod)}
                  />
                }
              />
              <Area
                dataKey={activeMetric}
                type="monotone"
                fill="url(#fillUsers)"
                fillOpacity={0.4}
                stroke="hsl(30 80% 55%)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Toggle between New Users and Active Users to compare metrics over
            time
          </p>
        </CardContent>
      </Card>

      {/* Total Users KPI */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardDescription>All-Time Total Users</CardDescription>
          <CardTitle className="text-5xl">
            {data.total_users.total_users.toLocaleString()}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Cumulative users since platform launch
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
