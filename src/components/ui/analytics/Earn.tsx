"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
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

interface EarnTabProps {
  periodicStats: PeriodicStats | null;
  formatDate: (dateStr: string, period: TimePeriod) => string;
  timePeriod: TimePeriod;
}

export function EarnTab({
  periodicStats,
  formatDate,
  timePeriod,
}: EarnTabProps) {
  const chartConfig = {
    count: {
      label: "Earn",
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
  const volumeData =
    periodicStats?.periodic_earn_stats.map((item) => ({
      period: item.period_start,
      count: item.total_earn_count,
    })) || [];

  // Radial data for protocol distribution
  const radialData = Object.entries(aggregatedEarn.byProtocol).map(
    ([protocol, count], index) => ({
      name: protocol,
      value: count,
      fill: `hsl(${30 + index * 12} ${75 + index * 3}% ${52 + index * 2}%)`,
    }),
  );

  return (
    <div className="space-y-6">
      {/* Radial Stacked Chart - Total + By Protocol */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader className="items-center pb-0">
          <CardTitle>Earn Distribution by Protocol</CardTitle>
          <CardDescription>
            Activity across earn protocols for selected period
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
                domain={[0, aggregatedEarn.total]}
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
                          {aggregatedEarn.total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Total Earn
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-4 pb-6">
            {Object.entries(aggregatedEarn.byProtocol).map(
              ([protocol, count], index) => (
                <div key={protocol} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: `hsl(${30 + index * 12} ${75 + index * 3}% ${52 + index * 2}%)`,
                    }}
                  />
                  <span className="text-sm">
                    {protocol}: {count.toLocaleString()}
                  </span>
                </div>
              ),
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center pb-4">
            Distribution of earn activity across protocols (etherFi, Yearn,
            Lido, etc.)
          </p>
        </CardContent>
      </Card>

      {/* Earn Volume Over Time */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Earn Volume Over Time</CardTitle>
          <CardDescription>Total earn transactions per period</CardDescription>
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
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Earn transaction volume trends over the selected period
          </p>
        </CardContent>
      </Card>

      {/* By Chain - Horizontal Bars */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Earn by Chain</CardTitle>
          <CardDescription>
            Earn activity distribution across blockchains
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(aggregatedEarn.byChain)
              .sort(([, a], [, b]) => b - a)
              .map(([chain, count]) => {
                const maxCount = Math.max(
                  ...Object.values(aggregatedEarn.byChain),
                );
                const percentage = (count / maxCount) * 100;

                return (
                  <div key={chain} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{chain}</span>
                      <span className="text-[hsl(30_80%_55%)] font-semibold">
                        {count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-3 bg-[#27272A] rounded-full overflow-hidden">
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
            Horizontal bars showing earn distribution across blockchain networks
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
