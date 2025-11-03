"use client";

import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/Chart";
import { AnalyticsData, PeriodicStats, TimePeriod } from "@/types/analytics";
import {
  AREA_CHART_COLORS,
  getBarChartColors,
} from "@/utils/analytics/analytics";

interface ActivityTabProps {
  data: AnalyticsData;
  periodicStats: PeriodicStats | null;
  formatDate: (dateStr: string, period: TimePeriod) => string;
  timePeriod: TimePeriod;
}

export function ActivityTab({
  data,
  periodicStats,
  formatDate,
  timePeriod,
}: ActivityTabProps) {
  const breakdownColors = getBarChartColors(3);

  const chartConfig = {
    transactions: {
      label: "Transactions",
      color: AREA_CHART_COLORS.primary,
    },
    swap_count: {
      label: "Swaps",
      color: breakdownColors[0],
    },
    lending_count: {
      label: "Lending",
      color: breakdownColors[1],
    },
    earn_count: {
      label: "Earn",
      color: breakdownColors[2],
    },
    entrances: {
      label: "Entrances",
      color: AREA_CHART_COLORS.primary,
    },
    ratio: {
      label: "Ratio",
      color: AREA_CHART_COLORS.secondary,
    },
  } satisfies ChartConfig;

  const transactionData =
    periodicStats?.periodic_activity_stats.map((item) => ({
      period: item.period_start,
      transactions: item.swap_count + item.lending_count + item.earn_count,
      swap_count: item.swap_count,
      lending_count: item.lending_count,
      earn_count: item.earn_count,
    })) || [];

  const entrancesData =
    periodicStats?.periodic_activity_stats.map((item) => ({
      period: item.period_start,
      entrances: item.dapp_entrances,
    })) || [];

  const transactionsPerUser =
    periodicStats?.periodic_activity_stats.map((item) => {
      const transactions =
        item.swap_count + item.lending_count + item.earn_count;
      const activeUsers = item.active_users || 1;
      return {
        period: item.period_start,
        ratio: transactions / activeUsers,
      };
    }) || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>Total Transactions</CardDescription>
            <CardTitle className="text-4xl">
              {data.total_activity_stats.total_transactions.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>dApp Entrances</CardDescription>
            <CardTitle className="text-4xl">
              {data.total_activity_stats.dapp_entrances.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>Transactions per User</CardDescription>
            <CardTitle className="text-4xl">
              {(
                data.total_activity_stats.total_transactions /
                data.total_activity_stats.total_users
              ).toFixed(1)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Transaction Volume Chart */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Transactions Over Time</CardTitle>
          <CardDescription>Total transactions per period</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={transactionData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} stroke="#27272A" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32} // Added this prop
                tickFormatter={(value) => formatDate(value, timePeriod)}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="transactions"
                fill={AREA_CHART_COLORS.primary}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Activity Breakdown Stacked Chart */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Activity Breakdown</CardTitle>
          <CardDescription>Swaps, Lending, and Earn activities</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={transactionData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} stroke="#27272A" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32} // Added this prop
                tickFormatter={(value) => formatDate(value, timePeriod)}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="swap_count"
                stackId="a"
                fill={breakdownColors[0]}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="lending_count"
                stackId="a"
                fill={breakdownColors[1]}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="earn_count"
                stackId="a"
                fill={breakdownColors[2]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* dApp Entrances Chart */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>dApp Entrances Over Time</CardTitle>
          <CardDescription>User visits to the dApp</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              data={entrancesData}
              margin={{ top: 8, left: 12, right: 12 }}
            >
              <defs>
                <linearGradient id="fillEntrances" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={AREA_CHART_COLORS.primary}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={AREA_CHART_COLORS.primary}
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
                dataKey="entrances"
                type="monotone"
                fill="url(#fillEntrances)"
                fillOpacity={0.4}
                stroke={AREA_CHART_COLORS.primary}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Transactions per Active User */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Transactions per Active User</CardTitle>
          <CardDescription>Engagement metric</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              data={transactionsPerUser}
              margin={{ top: 8, left: 12, right: 12 }}
            >
              <defs>
                <linearGradient id="fillRatio" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={AREA_CHART_COLORS.secondary}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={AREA_CHART_COLORS.secondary}
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
                dataKey="ratio"
                type="monotone"
                fill="url(#fillRatio)"
                fillOpacity={0.4}
                stroke={AREA_CHART_COLORS.secondary}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
