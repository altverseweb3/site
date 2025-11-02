"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, Pie, PieChart, XAxis } from "recharts";
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

interface EarnTabProps {
  data: AnalyticsData;
  periodicStats: PeriodicStats | null;
  formatDate: (dateStr: string, period: TimePeriod) => string;
  timePeriod: TimePeriod;
}

export function EarnTab({
  data,
  periodicStats,
  formatDate,
  timePeriod,
}: EarnTabProps) {
  const chartConfig = {
    count: {
      label: "Earn Operations",
      color: "hsl(30 80% 55%)",
    },
  } satisfies ChartConfig;

  // Aggregate earn data from time period
  const aggregatedEarn = React.useMemo(() => {
    if (!periodicStats) return { total: 0, byProtocol: {}, byChain: {} };

    const totals = periodicStats.periodic_earn_stats.reduce(
      (acc, item) => {
        const total = acc.total + item.total_earn_count;
        const byProtocol = { ...acc.byProtocol };
        const byChain = { ...acc.byChain };

        Object.entries(item.by_protocol).forEach(([key, value]) => {
          byProtocol[key] = (byProtocol[key] || 0) + value;
        });

        Object.entries(item.by_chain).forEach(([key, value]) => {
          byChain[key] = (byChain[key] || 0) + value;
        });

        return { total, byProtocol, byChain };
      },
      {
        total: 0,
        byProtocol: {} as Record<string, number>,
        byChain: {} as Record<string, number>,
      },
    );

    return totals;
  }, [periodicStats]);

  // Volume over time
  const volumeData = React.useMemo(() => {
    if (!periodicStats) return [];

    return periodicStats.periodic_earn_stats.map((item) => ({
      date: item.period_start,
      count: item.total_earn_count,
    }));
  }, [periodicStats]);

  // Chain breakdown for pie chart
  const chainChartData = React.useMemo(() => {
    return Object.entries(aggregatedEarn.byChain).map(
      ([chain, count], index) => ({
        name: chain,
        value: count,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
      }),
    );
  }, [aggregatedEarn.byChain]);

  // Protocol breakdown for pie chart
  const protocolChartData = React.useMemo(() => {
    return Object.entries(aggregatedEarn.byProtocol).map(
      ([protocol, count], index) => ({
        name: protocol,
        value: count,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
      }),
    );
  }, [aggregatedEarn.byProtocol]);

  // Chart configs for pie charts
  const chainConfig = React.useMemo(() => {
    const config: Record<string, { label: string; color?: string }> = {
      value: { label: "Operations" },
    };
    Object.keys(aggregatedEarn.byChain).forEach((chain, index) => {
      config[chain] = {
        label: chain,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      };
    });
    return config satisfies ChartConfig;
  }, [aggregatedEarn.byChain]);

  const protocolConfig = React.useMemo(() => {
    const config: Record<string, { label: string; color?: string }> = {
      value: { label: "Operations" },
    };
    Object.keys(aggregatedEarn.byProtocol).forEach((protocol, index) => {
      config[protocol] = {
        label: protocol,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      };
    });
    return config satisfies ChartConfig;
  }, [aggregatedEarn.byProtocol]);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Total Earn Operations (All-Time) Card */}
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>Total Earn Operations</CardDescription>
            <CardTitle className="text-4xl">
              {data.total_earn_stats.total_earn_count.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Earn Operations (Period) Card */}
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>Earn Operations (Period)</CardDescription>
            <CardTitle className="text-4xl">
              {aggregatedEarn.total.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Earn Volume Over Time - Area Chart */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Earn Volume Over Time</CardTitle>
          <CardDescription>Total earn operations per period</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={volumeData} margin={{ left: 12, right: 12 }}>
              <defs>
                <linearGradient id="fillEarn" x1="0" y1="0" x2="0" y2="1">
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
                dataKey="date"
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
                dataKey="count"
                type="monotone"
                fill="url(#fillEarn)"
                fillOpacity={0.4}
                stroke="hsl(30 80% 55%)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Chain and Protocol Breakdown - Side by Side Donut Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chain Breakdown - Donut Pie Chart */}
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader className="items-center pb-0">
            <CardTitle>Chain Breakdown</CardTitle>
            <CardDescription>Earn operations by chain</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={chainConfig}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={chainChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Protocol Breakdown - Donut Pie Chart */}
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader className="items-center pb-0">
            <CardTitle>Protocol Breakdown</CardTitle>
            <CardDescription>Earn operations by protocol</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={protocolConfig}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={protocolChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
