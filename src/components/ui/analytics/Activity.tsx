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
  const chartConfig = {
    transactions: {
      label: "Transactions",
      color: "hsl(30 80% 55%)",
    },
    swap_count: {
      label: "Swaps",
      color: "hsl(30 80% 55%)",
    },
    lending_count: {
      label: "Lending",
      color: "hsl(40 90% 60%)",
    },
    earn_count: {
      label: "Earn",
      color: "hsl(20 80% 50%)",
    },
    entrances: {
      label: "Entrances",
      color: "hsl(30 80% 55%)",
    },
    ratio: {
      label: "Ratio",
      color: "hsl(35 85% 60%)",
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
                fill="hsl(30 80% 55%)"
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
                fill="hsl(30 80% 55%)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="lending_count"
                stackId="a"
                fill="hsl(40 90% 60%)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="earn_count"
                stackId="a"
                fill="hsl(20 80% 50%)"
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
            <AreaChart data={entrancesData} margin={{ left: 12, right: 12 }}>
              <defs>
                <linearGradient id="fillEntrances" x1="0" y1="0" x2="0" y2="1">
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
                stroke="hsl(30 80% 55%)"
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
              margin={{ left: 12, right: 12 }}
            >
              <defs>
                <linearGradient id="fillRatio" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(35 85% 60%)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(35 85% 60%)"
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
                stroke="hsl(35 85% 60%)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
