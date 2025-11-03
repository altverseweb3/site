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
import {
  AnalyticsData,
  PeriodicLendingBreakdown,
  PeriodicStats,
  TimePeriod,
} from "@/types/analytics";
import {
  AREA_CHART_COLORS,
  getDonutChartColors,
} from "@/utils/analytics/analytics";

interface LendingTabProps {
  data: AnalyticsData;
  periodicStats: PeriodicStats | null;
  formatDate: (dateStr: string, period: TimePeriod) => string;
  timePeriod: TimePeriod;
}

export function LendingTab({
  data,
  periodicStats,
  formatDate,
  timePeriod,
}: LendingTabProps) {
  const chartConfig = {
    count: {
      label: "Lending Operations",
      color: AREA_CHART_COLORS.primary,
    },
  } satisfies ChartConfig;

  // Aggregate lending data from time period
  const aggregatedLending = React.useMemo(() => {
    if (!periodicStats)
      return { total: 0, byMarket: {}, byChain: {}, breakdown: [] };

    const totals = periodicStats.periodic_lending_stats.reduce(
      (acc, item) => {
        const total = acc.total + item.total_lending_count;
        const breakdown = [...acc.breakdown, ...item.breakdown];
        return { total, breakdown };
      },
      { total: 0, breakdown: [] as PeriodicLendingBreakdown[] },
    );

    // Aggregate by protocol (market)
    const byMarket = totals.breakdown.reduce(
      (acc, item) => {
        const protocol = item.market
          .replace(item.chain, "")
          .replace(/^(Aave|Compound|Solend)/, "$1");
        acc[protocol] = (acc[protocol] || 0) + item.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Aggregate by chain
    const byChain = totals.breakdown.reduce(
      (acc, item) => {
        acc[item.chain] = (acc[item.chain] || 0) + item.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: totals.total,
      byMarket,
      byChain,
      breakdown: totals.breakdown,
    };
  }, [periodicStats]);

  // Volume over time
  const volumeData = React.useMemo(() => {
    if (!periodicStats) return [];

    return periodicStats.periodic_lending_stats.map((item) => ({
      date: item.period_start,
      count: item.total_lending_count,
    }));
  }, [periodicStats]);

  // Chain breakdown for pie chart
  const chainChartData = React.useMemo(() => {
    const entries = Object.entries(aggregatedLending.byChain);
    const colors = getDonutChartColors(entries.length);
    return entries.map(([chain, count], index) => ({
      name: chain,
      value: count,
      fill: colors[index],
    }));
  }, [aggregatedLending.byChain]);

  // Protocol breakdown for pie chart
  const protocolChartData = React.useMemo(() => {
    const entries = Object.entries(aggregatedLending.byMarket);
    const colors = getDonutChartColors(entries.length);
    return entries.map(([protocol, count], index) => ({
      name: protocol,
      value: count,
      fill: colors[index],
    }));
  }, [aggregatedLending.byMarket]);

  // Chart configs for pie charts
  const chainConfig = React.useMemo(() => {
    const config: Record<string, { label: string; color?: string }> = {
      value: { label: "Operations" },
    };
    const entries = Object.keys(aggregatedLending.byChain);
    const colors = getDonutChartColors(entries.length);
    entries.forEach((chain, index) => {
      config[chain] = {
        label: chain,
        color: colors[index],
      };
    });
    return config satisfies ChartConfig;
  }, [aggregatedLending.byChain]);

  const protocolConfig = React.useMemo(() => {
    const config: Record<string, { label: string; color?: string }> = {
      value: { label: "Operations" },
    };
    const entries = Object.keys(aggregatedLending.byMarket);
    const colors = getDonutChartColors(entries.length);
    entries.forEach((protocol, index) => {
      config[protocol] = {
        label: protocol,
        color: colors[index],
      };
    });
    return config satisfies ChartConfig;
  }, [aggregatedLending.byMarket]);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Total Lending Operations (All-Time) Card */}
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>Total Lending Operations</CardDescription>
            <CardTitle className="text-4xl">
              {data.total_lending_stats.total_lending_count.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Lending Operations (Period) Card */}
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>Lending Operations (Period)</CardDescription>
            <CardTitle className="text-4xl">
              {aggregatedLending.total.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lending Volume Over Time - Area Chart */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Lending Volume Over Time</CardTitle>
          <CardDescription>Total lending operations per period</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              data={volumeData}
              margin={{ top: 8, left: 12, right: 12 }}
            >
              <defs>
                <linearGradient id="fillLending" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#fillLending)"
                fillOpacity={0.4}
                stroke={AREA_CHART_COLORS.primary}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Chain and Protocol Breakdown - Side by Side Donut Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chain Breakdown - Donut Pie Chart */}
        <Card className="bg-[#18181B] border-[#27272A] flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Chain Breakdown</CardTitle>
            <CardDescription>Lending operations by chain</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={chainConfig}
              className="mx-auto aspect-square max-h-[300px]"
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
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Protocol Breakdown - Donut Pie Chart */}
        <Card className="bg-[#18181B] border-[#27272A] flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Protocol Breakdown</CardTitle>
            <CardDescription>Lending operations by protocol</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={protocolConfig}
              className="mx-auto aspect-square max-h-[300px]"
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
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
