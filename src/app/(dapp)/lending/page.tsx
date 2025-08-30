"use client";
import { useState, useEffect, useMemo } from "react";
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
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import BrandedButton from "@/components/ui/BrandedButton";
import { WalletType } from "@/types/web3";
import {
  useIsWalletTypeConnected,
  useSetActiveSwapSection,
  useWalletByType,
} from "@/store/web3Store";
import { useAaveMarketsWithLoading } from "@/hooks/aave/useAaveMarketsData";
import MarketContent from "@/components/ui/lending/MarketContent";
import DashboardContent from "@/components/ui/lending/DashboardContent";
import { ChainId } from "@/types/aave";
import { evmAddress } from "@aave/react";
import { getActiveAaveMarketsByChainId } from "@/utils/lending/marketConfig";
import { AggregatedTransactionHistory } from "@/components/ui/lending/AggregatedTransactionHistory";
import HistoryContent from "@/components/ui/lending/TransactionContent";

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

  const setActiveSwapSection = useSetActiveSwapSection();
  const isEvmWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);
  const userWalletAddress = useWalletByType(WalletType.REOWN_EVM)?.address;

  const determineChainsToFetch = (): ChainId[] => {
    if (selectedChains.length === 0 && supportedChains.length > 0)
      return supportedChains.map((chain) => chain.chainId as ChainId);
    return selectedChains.map((chain) => chain.chainId as ChainId);
  };

  // Compute active markets for transaction history
  const activeMarkets = useMemo(() => {
    const chainIds: ChainId[] =
      selectedChains.length === 0 && supportedChains.length > 0
        ? supportedChains.map((chain) => chain.chainId as ChainId)
        : selectedChains.map((chain) => chain.chainId as ChainId);

    return chainIds.flatMap((chainId) =>
      getActiveAaveMarketsByChainId(chainId).map((market) => ({
        ...market,
        chainId,
      })),
    );
  }, [selectedChains, supportedChains]);

  // Fetch markets data with loading state
  const { markets, loading } = useAaveMarketsWithLoading({
    chainIds: determineChainsToFetch(),
    user: userWalletAddress ? evmAddress(userWalletAddress) : undefined,
  });

  useEffect(() => {
    setActiveSwapSection("lending");
  }, [setActiveSwapSection]);

  const handleTabChange = (value: LendingTabType) => {
    // Only update if a valid value is provided (prevents deselection)
    if (value) {
      setActiveTab(value);
    }
  };

  // Show wallet connection requirement for dashboard and history tabs
  const showWalletConnectionRequired =
    !isEvmWalletConnected &&
    (activeTab === "dashboard" || activeTab === "history");

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
          {showWalletConnectionRequired ? (
            <div className="text-center py-16 md:py-24 px-4 md:px-8">
              <p className="text-zinc-400 mb-6 px-2 sm:px-8 md:px-16 lg:px-20 text-sm md:text-lg max-w-3xl mx-auto leading-relaxed">
                please connect an EVM wallet (metamask, etc.) to view and manage
                your positions. other environments (sui, solana, etc.) are
                supported; however, presently your positions will only be held
                and managed on EVM wallets as they will opened and managed on
                ethereum or other EVM chains.
              </p>
              <ConnectWalletModal
                trigger={
                  <BrandedButton
                    iconName="Wallet"
                    buttonText="connect EVM wallet"
                    className="max-w-xs h-8 text-sm md:text-md"
                  />
                }
              />
            </div>
          ) : activeTab === "markets" && loading ? (
            <div className="text-center py-16">
              <div className="text-[#A1A1AA]">loading markets...</div>
            </div>
          ) : activeTab === "markets" && (!markets || markets.length === 0) ? (
            <div className="text-center py-16">
              <div className="text-[#A1A1AA]">no markets found</div>
            </div>
          ) : (
            <>
              {activeTab === "markets" && <MarketContent markets={markets} />}
              {activeTab === "dashboard" && (
                <DashboardContent
                  userAddress={userWalletAddress}
                  selectedChains={selectedChains}
                  activeMarkets={activeMarkets}
                />
              )}
              {activeTab === "history" && (
                <AggregatedTransactionHistory
                  activeMarkets={activeMarkets}
                  userWalletAddress={evmAddress(userWalletAddress!)}
                >
                  {({ transactions, loading }) => (
                    <HistoryContent data={transactions} loading={loading} />
                  )}
                </AggregatedTransactionHistory>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
