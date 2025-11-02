"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
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

  // Top routes data for horizontal bar chart
  const topRoutesData = React.useMemo(() => {
    return Object.entries(aggregatedSwaps.routes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([route, count]) => {
        const [source, target] = route.split(",");
        return {
          route: route,
          source: source,
          target: target,
          routeLabel: `${source} → ${target}`,
          count,
        };
      });
  }, [aggregatedSwaps.routes]);

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
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={volumeData}>
              <defs>
                <linearGradient id="fillCrossChain" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-cross_chain)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-cross_chain)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillSameChain" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-same_chain)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-same_chain)"
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
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => formatDate(value, timePeriod)}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="same_chain"
                type="natural"
                fill="url(#fillSameChain)"
                stroke="var(--color-same_chain)"
                stackId="a"
              />
              <Area
                dataKey="cross_chain"
                type="natural"
                fill="url(#fillCrossChain)"
                stroke="var(--color-cross_chain)"
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Top Swap Routes - Horizontal Bar Chart */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Top Swap Routes</CardTitle>
          <CardDescription>Most popular chain-to-chain swaps</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={topRoutesData}
              layout="vertical"
              margin={{
                left: 0,
              }}
            >
              <XAxis type="number" dataKey="count" hide />
              <YAxis
                dataKey="route"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                width={80}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const item = topRoutesData.find(
                    (d) => d.route === payload.value,
                  );
                  if (!item) return <></>;

                  const source =
                    item.source.charAt(0).toUpperCase() + item.source.slice(1);
                  const target =
                    item.target.charAt(0).toUpperCase() + item.target.slice(1);

                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0}
                        y={-4}
                        textAnchor="end"
                        className="fill-foreground"
                        style={{ fontSize: 11 }}
                      >
                        {source} →
                      </text>
                      <text
                        x={0}
                        y={12}
                        textAnchor="end"
                        className="fill-foreground"
                        style={{ fontSize: 11 }}
                      >
                        {target}
                      </text>
                    </g>
                  );
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name, item) => (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium capitalize">
                          {item.payload.routeLabel}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {value} swaps
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="count" fill="var(--color-cross_chain)" radius={5} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
