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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/Chart";
import { AnalyticsData, PeriodicStats, TimePeriod } from "@/types/analytics";
import { getAreaChartColors } from "@/utils/analytics/analytics";

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
  const areaColors = getAreaChartColors(2);

  const chartConfig = {
    active_users: {
      label: "Active Users",
      color: areaColors[1],
    },
    new_users: {
      label: "New Users",
      color: areaColors[0],
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

      {/* New Users Chart */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>New Users Over Time</CardTitle>
          <CardDescription>New user signups per period</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              data={chartData}
              margin={{ top: 8, left: 12, right: 12 }}
            >
              <defs>
                <linearGradient id="fillNewUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={areaColors[0]}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={areaColors[0]}
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
                stroke={areaColors[0]}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Active Users Chart */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Active Users Over Time</CardTitle>
          <CardDescription>Active users per period</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              data={chartData}
              margin={{ top: 8, left: 12, right: 12 }}
            >
              <defs>
                <linearGradient
                  id="fillActiveUsers"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={areaColors[1]}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={areaColors[1]}
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
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => formatDate(value, timePeriod)}
                  />
                }
              />
              <Area
                dataKey="active_users"
                type="monotone"
                fill="url(#fillActiveUsers)"
                fillOpacity={0.4}
                stroke={areaColors[1]}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
