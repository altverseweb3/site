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
import {
  PeriodicLendingBreakdown,
  PeriodicStats,
  TimePeriod,
} from "@/types/analytics";

interface LendingTabProps {
  periodicStats: PeriodicStats | null;
  formatDate: (dateStr: string, period: TimePeriod) => string;
  timePeriod: TimePeriod;
}

export function LendingTab({
  periodicStats,
  formatDate,
  timePeriod,
}: LendingTabProps) {
  const chartConfig = {
    count: {
      label: "Lending",
      color: "hsl(30 80% 55%)",
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

    // Aggregate by market
    const byMarket = totals.breakdown.reduce(
      (acc, item) => {
        const market = item.market
          .replace(item.chain, "")
          .replace(/^(Aave|Compound|Solend)/, "$1");
        acc[market] = (acc[market] || 0) + item.count;
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
  const volumeData =
    periodicStats?.periodic_lending_stats.map((item) => ({
      period: item.period_start,
      count: item.total_lending_count,
    })) || [];

  // Radial data for market distribution
  const radialData = Object.entries(aggregatedLending.byMarket).map(
    ([market, count], index) => ({
      name: market,
      value: count,
      fill: `hsl(${30 + index * 15} ${70 + index * 5}% ${50 + index * 3}%)`,
    }),
  );

  return (
    <div className="space-y-6">
      {/* Radial Stacked Chart - Total + By Market */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader className="items-center pb-0">
          <CardTitle>Lending Distribution by Market</CardTitle>
          <CardDescription>
            Protocol usage across selected period
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
                domain={[0, aggregatedLending.total]}
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
                          {aggregatedLending.total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Total Lending
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-4 pb-6">
            {Object.entries(aggregatedLending.byMarket).map(
              ([market, count], index) => (
                <div key={market} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: `hsl(${30 + index * 15} ${70 + index * 5}% ${50 + index * 3}%)`,
                    }}
                  />
                  <span className="text-sm">
                    {market}: {count.toLocaleString()}
                  </span>
                </div>
              ),
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center pb-4">
            Distribution of lending activity across different markets (Aave,
            Compound, Solend)
          </p>
        </CardContent>
      </Card>

      {/* Lending Volume Over Time */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Lending Volume Over Time</CardTitle>
          <CardDescription>
            Total lending transactions per period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={volumeData} margin={{ left: 12, right: 12 }}>
              <defs>
                <linearGradient id="fillLending" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#fillLending)"
                fillOpacity={0.4}
                stroke="hsl(30 80% 55%)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Lending transaction volume trends over the selected period
          </p>
        </CardContent>
      </Card>

      {/* Detailed Breakdown - Horizontal Bars */}
      <Card className="bg-[#18181B] border-[#27272A]">
        <CardHeader>
          <CardTitle>Chain & Market Breakdown</CardTitle>
          <CardDescription>
            Lending activity by chain and protocol
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(aggregatedLending.byChain)
              .sort(([, a], [, b]) => b - a)
              .map(([chain, count]) => {
                const maxCount = Math.max(
                  ...Object.values(aggregatedLending.byChain),
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
            Horizontal bars showing lending distribution across blockchain
            networks
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
