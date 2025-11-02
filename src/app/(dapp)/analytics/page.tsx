"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Users, Activity, Repeat, Landmark, Wallet } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { AnalyticsData, TimePeriod, TabType } from "@/types/analytics";
import { UsersTab } from "@/components/ui/analytics/Users";
import { ActivityTab } from "@/components/ui/analytics/Activity";
import { SwapsTab } from "@/components/ui/analytics/Swaps";
import { LendingTab } from "@/components/ui/analytics/Lending";
import { EarnTab } from "@/components/ui/analytics/Earn";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("last30");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [selectedFile] = useState<string>("mock_analytics.json");

  // Load JSON file
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const response = await fetch(`/analytics/${selectedFile}`);
        const data = await response.json();
        setAnalyticsData(data);
        setLoading(false);
      } catch (error) {
        console.error("Error loading analytics data:", error);
        setLoading(false);
      }
    };

    loadFiles();
  }, [selectedFile]);

  // Process periodic data based on selected time period
  const periodicStats = useMemo(() => {
    if (!analyticsData?.periodic_stats) return null;

    if (timePeriod === "last7" || timePeriod === "last30") {
      const daily = analyticsData.periodic_stats.daily;
      if (!daily) return null;

      const limit = timePeriod === "last7" ? 7 : 30;
      return {
        periodic_user_stats: daily.periodic_user_stats.slice(-limit).reverse(),
        periodic_activity_stats: daily.periodic_activity_stats
          .slice(-limit)
          .reverse(),
        periodic_swap_stats: daily.periodic_swap_stats.slice(-limit).reverse(),
        periodic_lending_stats: daily.periodic_lending_stats
          .slice(-limit)
          .reverse(),
        periodic_earn_stats: daily.periodic_earn_stats.slice(-limit).reverse(),
      };
    } else if (timePeriod === "weekly") {
      return analyticsData.periodic_stats.weekly || null;
    } else if (timePeriod === "monthly") {
      return analyticsData.periodic_stats.monthly || null;
    }

    return null;
  }, [analyticsData, timePeriod]);

  // Utility function to format dates based on time period
  const formatDate = (dateStr: string, period: TimePeriod) => {
    const date = new Date(dateStr);
    if (period === "monthly") {
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-2 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="text-muted-foreground">Loading analytics...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto px-2 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="text-muted-foreground">
              No analytics data available
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 md:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
            {/* Tabs */}
            <ToggleGroup
              type="single"
              value={activeTab}
              onValueChange={(value) => value && setActiveTab(value as TabType)}
              className="justify-start"
            >
              <ToggleGroupItem value="users" aria-label="Users">
                <Users className="h-4 w-4 mr-2" />
                Users
              </ToggleGroupItem>
              <ToggleGroupItem value="activity" aria-label="Activity">
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </ToggleGroupItem>
              <ToggleGroupItem value="swaps" aria-label="Swaps">
                <Repeat className="h-4 w-4 mr-2" />
                Swaps
              </ToggleGroupItem>
              <ToggleGroupItem value="lending" aria-label="Lending">
                <Landmark className="h-4 w-4 mr-2" />
                Lending
              </ToggleGroupItem>
              <ToggleGroupItem value="earn" aria-label="Earn">
                <Wallet className="h-4 w-4 mr-2" />
                Earn
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Time Period Selector */}
            <Select
              value={timePeriod}
              onValueChange={(value) => setTimePeriod(value as TimePeriod)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7">Last 7 days</SelectItem>
                <SelectItem value="last30">Last 30 days</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "users" && (
          <UsersTab
            data={analyticsData}
            periodicStats={periodicStats}
            formatDate={formatDate}
            timePeriod={timePeriod}
          />
        )}
        {activeTab === "activity" && (
          <ActivityTab
            data={analyticsData}
            periodicStats={periodicStats}
            formatDate={formatDate}
            timePeriod={timePeriod}
          />
        )}
        {activeTab === "swaps" && (
          <SwapsTab
            periodicStats={periodicStats}
            formatDate={formatDate}
            timePeriod={timePeriod}
          />
        )}
        {activeTab === "lending" && (
          <LendingTab
            periodicStats={periodicStats}
            formatDate={formatDate}
            timePeriod={timePeriod}
          />
        )}
        {activeTab === "earn" && (
          <EarnTab
            periodicStats={periodicStats}
            formatDate={formatDate}
            timePeriod={timePeriod}
          />
        )}
      </div>
    </div>
  );
}
