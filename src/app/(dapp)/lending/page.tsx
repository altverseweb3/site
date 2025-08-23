"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import { History } from "lucide-react";

type LendingTabType = "markets" | "dashboard" | "staking" | "history";

export default function LendingPage() {
  const [activeTab, setActiveTab] = useState<LendingTabType>("markets");

  const handleTabChange = (value: LendingTabType) => {
    setActiveTab(value);
  };

  return (
    <div className="container mx-auto px-2 md:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Tab Toggle */}
        <div className="mb-6">
          <div className="overflow-x-auto">
            <ToggleGroup
              type="single"
              value={activeTab}
              onValueChange={handleTabChange}
              variant="outline"
              className="justify-start shrink-0 min-w-max"
            >
              <ToggleGroupItem
                value="markets"
                className="data-[state=on]:text-[#FAFAFA]"
              >
                markets
              </ToggleGroupItem>
              <ToggleGroupItem
                value="dashboard"
                className="data-[state=on]:text-[#FAFAFA]"
              >
                dashboard
              </ToggleGroupItem>
              <ToggleGroupItem
                value="history"
                className="data-[state=on]:text-[#FAFAFA]"
              >
                <History className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-lg overflow-hidden 2xl:mb-0 mb-12">
          <div className="p-8 text-center">
            <div className="text-[#A1A1AA] text-lg">
              {activeTab === "markets" && "Markets content coming soon..."}
              {activeTab === "dashboard" && "Dashboard content coming soon..."}
              {activeTab === "history" && "History content coming soon..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
