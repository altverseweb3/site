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

interface SwapsTabProps {
  data: AnalyticsData;
  periodicStats: PeriodicStats | null;
  formatDate: (dateStr: string, period: TimePeriod) => string;
  timePeriod: TimePeriod;
}

export function SwapsTab({
  data,
  periodicStats,
  formatDate,
  timePeriod,
}: SwapsTabProps) {
  const chartConfig = {
    cross_chain: {
      label: "Cross-Chain",
      color: "hsl(30 80% 55%)",
    },
    same_chain: {
      label: "Same-Chain",
      color: "hsl(40 85% 60%)",
    },
    count: {
      label: "Count",
      color: "hsl(30 80% 55%)",
    },
  } satisfies ChartConfig;

  // Aggregate data from time period
  const aggregatedSwaps = React.useMemo(() => {
    if (!periodicStats)
      return { total: 0, cross_chain: 0, same_chain: 0, routes: {} };

    const totals = periodicStats.periodic_swap_stats.reduce(
      (acc, item) => ({
        total: acc.total + item.total_swap_count,
        cross_chain: acc.cross_chain + item.cross_chain_count,
        same_chain: acc.same_chain + item.same_chain_count,
        routes: {
          ...acc.routes,
          ...Object.entries(item.swap_routes).reduce(
            (r, [k, v]) => {
              r[k] = (r[k] || 0) + v;
              return r;
            },
            acc.routes as Record<string, number>,
          ),
        },
      }),
      {
        total: 0,
        cross_chain: 0,
        same_chain: 0,
        routes: {} as Record<string, number>,
      },
    );

    return totals;
  }, [periodicStats]);

  // Volume over time data with separate counts for cross-chain and same-chain
  const volumeData = React.useMemo(() => {
    if (!periodicStats) return [];

    return periodicStats.periodic_swap_stats.map((item) => ({
      date: item.period_start,
      cross_chain: item.cross_chain_count,
      same_chain: item.same_chain_count,
    }));
  }, [periodicStats]);

  // Same-chain swaps breakdown by chain
  const sameChainData = React.useMemo(() => {
    const byChain: Record<string, number> = {};

    Object.entries(aggregatedSwaps.routes).forEach(([route, count]) => {
      const [source, target] = route.split(",");
      if (source === target) {
        byChain[source] = (byChain[source] || 0) + count;
      }
    });

    return Object.entries(byChain)
      .sort(([, a], [, b]) => b - a)
      .map(([chain, count], index) => ({
        name: chain.charAt(0).toUpperCase() + chain.slice(1),
        value: count,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
      }));
  }, [aggregatedSwaps.routes]);

  // Cross-chain routes breakdown (top 10)
  const crossChainRoutesData = React.useMemo(() => {
    return Object.entries(aggregatedSwaps.routes)
      .filter(([route]) => {
        const [source, target] = route.split(",");
        return source !== target;
      })
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([route, count], index) => {
        const [source, target] = route.split(",");
        return {
          route: route,
          name: `${source.charAt(0).toUpperCase() + source.slice(1)}→${target.charAt(0).toUpperCase() + target.slice(1)}`,
          value: count,
          fill: `hsl(var(--chart-${(index % 5) + 1}))`,
        };
      });
  }, [aggregatedSwaps.routes]);

  // Chart config for same-chain donut
  const sameChainConfig = React.useMemo(() => {
    const config: Record<string, { label: string; color?: string }> = {
      value: { label: "Swaps" },
    };
    sameChainData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      };
    });
    return config satisfies ChartConfig;
  }, [sameChainData]);

  // Chart config for cross-chain routes donut
  const crossChainConfig = React.useMemo(() => {
    const config: Record<string, { label: string; color?: string }> = {
      value: { label: "Swaps" },
    };
    crossChainRoutesData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      };
    });
    return config satisfies ChartConfig;
  }, [crossChainRoutesData]);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Swaps (All-Time) Card */}
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>Total Swaps</CardDescription>
            <CardTitle className="text-4xl">
              {data.total_swap_stats.total_swap_count.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Total Swaps (Period) Card */}
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>Total Swaps (Period)</CardDescription>
            <CardTitle className="text-4xl">
              {aggregatedSwaps.total.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Cross-Chain Swaps (Period) Card */}
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>Cross-Chain Swaps (Period)</CardDescription>
            <CardTitle className="text-4xl">
              {aggregatedSwaps.cross_chain.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Same-Chain Swaps (Period) Card */}
        <Card className="bg-[#18181B] border-[#27272A]">
          <CardHeader>
            <CardDescription>Same-Chain Swaps (Period)</CardDescription>
            <CardTitle className="text-4xl">
              {aggregatedSwaps.same_chain.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Swap Volume Over Time - Area Chart */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Swap Volume Over Time</CardTitle>
          <CardDescription>
            Cross-chain and same-chain swaps over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              data={volumeData}
              margin={{ top: 8, left: 12, right: 12 }}
            >
              <defs>
                <linearGradient id="fillCrossChain" x1="0" y1="0" x2="0" y2="1">
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
                <linearGradient id="fillSameChain" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(40 85% 60%)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(40 85% 60%)"
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
                dataKey="same_chain"
                type="monotone"
                fill="url(#fillSameChain)"
                fillOpacity={0.4}
                stroke="hsl(40 85% 60%)"
                strokeWidth={2}
                stackId="a"
              />
              <Area
                dataKey="cross_chain"
                type="monotone"
                fill="url(#fillCrossChain)"
                fillOpacity={0.4}
                stroke="hsl(30 80% 55%)"
                strokeWidth={2}
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Swap Route Breakdown - Side by Side Donut Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Same-Chain Swaps by Chain - Donut Chart */}
        <Card className="bg-[#18181B] border-[#27272A] flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Same-Chain Swaps</CardTitle>
            <CardDescription>Swaps by chain</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={sameChainConfig}
              className="mx-auto aspect-square max-h-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={sameChainData}
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

        {/* Cross-Chain Routes - Donut Chart */}
        <Card className="bg-[#18181B] border-[#27272A] flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Cross-Chain Routes</CardTitle>
            <CardDescription>Top cross-chain swap routes</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={crossChainConfig}
              className="mx-auto aspect-square max-h-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={crossChainRoutesData}
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
