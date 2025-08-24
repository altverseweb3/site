"use client";
import { useState, useMemo } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import { History } from "lucide-react";
import { Chain } from "@/types/web3";
import { chainList } from "@/config/chains";
import ChainPicker from "@/components/ui/ChainPicker";
import { useAaveChainsData } from "@/hooks/aave/useAaveChainsData";
import {
  useSelectedAaveChains,
  useSetSelectedAaveChains,
} from "@/store/web3Store";

type LendingTabType = "markets" | "dashboard" | "staking" | "history";

export default function LendingPage() {
  const [activeTab, setActiveTab] = useState<LendingTabType>("markets");

  const { data: aaveChains } = useAaveChainsData({});
  const selectedChains = useSelectedAaveChains();
  const setSelectedChains = useSetSelectedAaveChains();

  const supportedChains = useMemo(() => {
    if (!aaveChains) return [];
    const aaveSupportedChainIds = aaveChains.map(
      (aaveChain) => aaveChain.chainId,
    );
    return chainList.filter((chain) =>
      aaveSupportedChainIds.includes(chain.chainId),
    );
  }, [aaveChains]);

  const handleTabChange = (value: LendingTabType) => {
    setActiveTab(value);
  };

  return (
    <div className="container mx-auto px-2 md:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Tab Toggle and Chain Picker */}
        <div className="mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Tabs */}
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
              {/* Chain Picker */}
              <div className="flex justify-start">
                <ChainPicker
                  type="multiple"
                  value={selectedChains.map((chain) => chain.id)}
                  onSelectionChange={(value) => {
                    const valueArray = Array.isArray(value) ? value : [value];
                    const selected = valueArray
                      .map((id) =>
                        supportedChains.find((chain) => chain.id === id),
                      )
                      .filter(Boolean) as Chain[];
                    setSelectedChains(selected);
                  }}
                  chains={supportedChains}
                  size="sm"
                  className="!mb-0 !pb-0"
                />
              </div>
            </div>
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
