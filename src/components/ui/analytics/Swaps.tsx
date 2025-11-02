"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/Chart";
import { PeriodicStats, TimePeriod } from "@/types/analytics";

interface SwapsTabProps {
  periodicStats: PeriodicStats | null;
  formatDate: (dateStr: string, period: TimePeriod) => string;
  timePeriod: TimePeriod;
}

export function SwapsTab({
  periodicStats,
  formatDate,
  timePeriod,
}: SwapsTabProps) {
  const chartConfig = {
    total_swap_count: {
      label: "Swaps",
      color: "hsl(30 80% 55%)",
    },
    cross_chain: {
      label: "Cross-Chain",
      color: "hsl(30 80% 55%)",
    },
    same_chain: {
      label: "Same-Chain",
      color: "hsl(40 85% 60%)",
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

  // Volume over time data
  const volumeData =
    periodicStats?.periodic_swap_stats.map((item) => ({
      period: item.period_start,
      count: item.total_swap_count,
    })) || [];

  // Radial stacked chart data
  const radialData = [
    {
      name: "Cross-Chain",
      value: aggregatedSwaps.cross_chain,
      fill: "hsl(30 80% 55%)",
    },
    {
      name: "Same-Chain",
      value: aggregatedSwaps.same_chain,
      fill: "hsl(40 85% 60%)",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Radial Stacked Chart - Total + Cross/Same Chain */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader className="items-center pb-0">
          <CardTitle>Swap Distribution</CardTitle>
          <CardDescription>
            Cross-chain vs same-chain swaps for selected period
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[350px]"
          >
            <RadialBarChart
              data={radialData}
              startAngle={0}
              endAngle={250}
              innerRadius={80}
              outerRadius={140}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, aggregatedSwaps.total]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar dataKey="value" background cornerRadius={10} />
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-4xl font-bold"
                        >
                          {aggregatedSwaps.total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Total Swaps
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="flex justify-center gap-4 mt-4 pb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[hsl(30_80%_55%)]" />
              <span className="text-sm">
                Cross-Chain: {aggregatedSwaps.cross_chain.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[hsl(40_85%_60%)]" />
              <span className="text-sm">
                Same-Chain: {aggregatedSwaps.same_chain.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center pb-4">
            Breakdown of swap types across the selected time period
          </p>
        </CardContent>
      </Card>

      {/* Swap Volume Over Time */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Swap Volume Over Time</CardTitle>
          <CardDescription>Total swaps per period</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart
              data={volumeData}
              margin={{ left: 12, right: 12 }}
              layout="horizontal"
            >
              <CartesianGrid vertical={false} stroke="#27272A" />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis
                dataKey="period"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={80}
                tickFormatter={(value) => formatDate(value, timePeriod)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => formatDate(value, timePeriod)}
                  />
                }
              />
              <Bar
                dataKey="count"
                fill="hsl(30 80% 55%)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Horizontal bar chart showing swap activity across different time
            periods
          </p>
        </CardContent>
      </Card>

      {/* Top Swap Routes */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Top Swap Routes</CardTitle>
          <CardDescription>
            Most popular chain-to-chain swaps (aggregated)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(aggregatedSwaps.routes)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([route, count]) => {
                const [source, target] = route.split(",");
                const maxCount = Math.max(
                  ...Object.values(aggregatedSwaps.routes),
                );
                const percentage = (count / maxCount) * 100;

                return (
                  <div key={route} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">
                        {source} → {target}
                      </span>
                      <span className="text-[hsl(30_80%_55%)] font-semibold">
                        {count}
                      </span>
                    </div>
                    <div className="h-2 bg-[#27272A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[hsl(30_80%_55%)] rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Aggregated route data from the selected time period
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
