"use client";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import { History } from "lucide-react";
import { Chain } from "@/types/web3";
import { chainList } from "@/config/chains";
import ChainPicker from "@/components/ui/ChainPicker";

type LendingTabType = "markets" | "dashboard" | "staking" | "history";

export default function LendingPage() {
  const [activeTab, setActiveTab] = useState<LendingTabType>("markets");
  const [selectedChains, setSelectedChains] = useState<Chain[]>([]);

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

        {/* Chain Picker Container */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-lg mb-6 p-6">
          <div className="flex justify-start">
            <ChainPicker
              className="mb-0 pb-0"
              type="multiple"
              value={selectedChains.map((chain) => chain.id)}
              onSelectionChange={(value) => {
                const valueArray = Array.isArray(value) ? value : [value];
                const selected = valueArray
                  .map((id) => chainList.find((chain) => chain.id === id))
                  .filter(Boolean) as Chain[];
                setSelectedChains(selected);
              }}
              chains={chainList}
            />
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
