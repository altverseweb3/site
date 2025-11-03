"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
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
  const chartConfig = {
    new_users: {
      label: "New Users",
      color: "#f97316",
    },
    active_users: {
      label: "Active Users",
      color: "#eab308",
    },
  } satisfies ChartConfig;

  const chartData =
    periodicStats?.periodic_user_stats.map((item) => ({
      period: item.period_start,
      new_users: item.new_users,
      active_users: item.active_users,
    })) || [];

  const totalNewUsers = React.useMemo(
    () =>
      periodicStats?.periodic_user_stats.reduce(
        (acc, item) => acc + item.new_users,
        0,
      ) || 0,
    [periodicStats],
  );

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Total Users Card */}
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>All-Time Total Users</CardDescription>
            <CardTitle className="text-4xl">
              {data.total_users.total_users.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* New Users This Period Card */}
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>New Users (Period)</CardDescription>
            <CardTitle className="text-4xl">
              {totalNewUsers.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Combined Users Chart */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Users Over Time</CardTitle>
          <CardDescription>
            Track new users and active users across the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              data={chartData}
              margin={{ top: 8, left: 12, right: 12 }}
            >
              <defs>
                <linearGradient id="fillNewUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient
                  id="fillActiveUsers"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0.1} />
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
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => formatDate(value, timePeriod)}
                  />
                }
              />
              <Area
                dataKey="new_users"
                type="monotone"
                fill="url(#fillNewUsers)"
                fillOpacity={0.4}
                stroke="#f97316"
                strokeWidth={2}
                stackId="a"
              />
              <Area
                dataKey="active_users"
                type="monotone"
                fill="url(#fillActiveUsers)"
                fillOpacity={0.4}
                stroke="#eab308"
                strokeWidth={2}
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
