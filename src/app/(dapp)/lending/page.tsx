"use client";
import { useState, useEffect, useMemo } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import { History } from "lucide-react";
import SortDropdown from "@/components/ui/lending/SortDropdown";
import AssetFilter from "@/components/ui/AssetFilter";
import { Chain } from "@/types/web3";
import { chainList } from "@/config/chains";
import ChainPicker from "@/components/ui/ChainPicker";
import { useAaveChainsData } from "@/hooks/aave/useAaveChainsData";
import useWeb3Store, {
  useSelectedAaveChains,
  useSetSelectedAaveChains,
} from "@/store/web3Store";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import BrandedButton from "@/components/ui/BrandedButton";
import { WalletType, SwapStatus } from "@/types/web3";
import {
  useIsWalletTypeConnected,
  useSetActiveSwapSection,
  useWalletByType,
  useSourceChain,
  useDestinationChain,
  useSourceToken,
  useDestinationToken,
  useTransactionDetails,
} from "@/store/web3Store";
import { AggregatedMarketData } from "@/components/meta/AggregatedMarketData";
import MarketContent from "@/components/ui/lending/MarketContent";
import DashboardContent from "@/components/ui/lending/DashboardContent";
import { unifyMarkets } from "@/utils/lending/unifyMarkets";
import { ChainId } from "@/types/aave";
import { evmAddress, Market } from "@aave/react";
import { AggregatedTransactionHistory } from "@/components/ui/lending/AggregatedTransactionHistory";
import HistoryContent from "@/components/ui/lending/TransactionContent";
import { useTokenTransfer } from "@/utils/swap/walletMethods";
import { Button } from "@/components/ui/Button";
import { LendingFilters, LendingSortConfig } from "@/types/lending";
import { useSupplyOperations } from "@/hooks/lending/useSupplyOperations";

type LendingTabType = "markets" | "dashboard" | "staking" | "history";

export default function LendingPage() {
  const [activeTab, setActiveTab] = useState<LendingTabType>("markets");
  const [filters, setFilters] = useState<LendingFilters>({
    assetFilter: "",
  });
  const [sortConfig, setSortConfig] = useState<LendingSortConfig | null>(null);
  const [sortDropdownValue, setSortDropdownValue] = useState<string>("");

  const { data: aaveChains } = useAaveChainsData({});
  const selectedChains = useSelectedAaveChains();
  const setSelectedChains = useSetSelectedAaveChains();
  const sourceChain = useSourceChain();
  const destinationChain = useDestinationChain();
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const transactionDetails = useTransactionDetails();

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
  const loadTokens = useWeb3Store((state) => state.loadTokens);
  const isEvmWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);
  const userWalletAddress = useWalletByType(WalletType.REOWN_EVM)?.address;

  const determineChainsToFetch = (): ChainId[] => {
    if (selectedChains.length === 0 && supportedChains.length > 0)
      return supportedChains.map((chain) => chain.chainId as ChainId);
    return selectedChains.map((chain) => chain.chainId as ChainId);
  };

  // Create filtered and sorted unified markets function
  const createFilteredAndSortedUnifiedMarkets = (markets: Market[] | null) => {
    if (!markets) return null;

    // First unify the markets
    const unifiedMarkets = unifyMarkets(markets);
    let filtered = unifiedMarkets;

    // Filter by asset
    if (filters.assetFilter) {
      const filterLower = filters.assetFilter.toLowerCase();
      filtered = unifiedMarkets.filter((market) => {
        return (
          market.underlyingToken.symbol.toLowerCase().includes(filterLower) ||
          market.underlyingToken.name.toLowerCase().includes(filterLower) ||
          market.marketName.toLowerCase().includes(filterLower)
        );
      });
    }

    // Sort unified markets
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: number;
        let bValue: number;

        switch (sortConfig.column) {
          case "supplyApy":
            aValue = a.supplyData.apy;
            bValue = b.supplyData.apy;
            break;
          case "borrowApy":
            aValue = a.borrowData.apy;
            bValue = b.borrowData.apy;
            break;
          case "suppliedMarketCap":
            aValue = a.supplyData.totalSuppliedUsd;
            bValue = b.supplyData.totalSuppliedUsd;
            break;
          case "borrowedMarketCap":
            aValue = a.borrowData.totalBorrowedUsd;
            bValue = b.borrowData.totalBorrowedUsd;
            break;
          default:
            aValue = 0;
            bValue = 0;
        }

        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      });
    }

    return filtered;
  };

  const tokenTransferState = useTokenTransfer({
    type: "lending/aave", // remember to change me when we integrate with other vaults
    sourceChain,
    destinationChain,
    sourceToken,
    destinationToken,
    transactionDetails,
    enableTracking: true,
    pauseQuoting:
      sourceToken?.address === destinationToken?.address &&
      sourceChain?.id === destinationChain?.id, // TODO: validate me
    onSuccess: () => {
      console.log("lending swap initiated successfully");
    },
    onTrackingComplete: (status: SwapStatus) => {
      console.log("lending swap completed successfully with status", status);
    },
    onError: (error) => {
      console.error("lending swap error:", error);
    },
  });

  const { handleSupply } = useSupplyOperations({
    sourceChain,
    sourceToken,
    userWalletAddress: userWalletAddress || null,
    tokenTransferState: {
      amount: tokenTransferState.amount || "",
    },
  });

  useEffect(() => {
    setActiveSwapSection("lending");
    loadTokens();
  }, [setActiveSwapSection, loadTokens]);

  const handleTabChange = (value: LendingTabType) => {
    // Only update if a valid value is provided (prevents deselection)
    if (value) {
      setActiveTab(value);
      // Reset sort when switching tabs
      setSortConfig(null);
      setSortDropdownValue("");
    }
  };

  const handleSortDropdownChange = (
    column: string,
    direction: "asc" | "desc",
  ) => {
    setSortConfig({ column, direction });
    // Set dropdown value based on column and direction
    const sortOption = `${column.replace("Apy", "-apy").replace("MarketCap", "-mc").replace("Available", "-available").replace("user", "value-").replace("SuppliedValue", "supplied").replace("BorrowedValue", "borrowed")}-${direction}`;
    setSortDropdownValue(sortOption);
  };

  const handleAssetFilterChange = (value: string) => {
    setFilters((prev) => ({ ...prev, assetFilter: value }));
  };

  const [currentSubsection, setCurrentSubsection] =
    useState("supply-available");

  // Show wallet connection requirement for dashboard and history tabs
  const showWalletConnectionRequired =
    !isEvmWalletConnected &&
    (activeTab === "dashboard" || activeTab === "history");

  return (
    <AggregatedMarketData
      chainIds={determineChainsToFetch()}
      user={userWalletAddress ? evmAddress(userWalletAddress) : undefined}
    >
      {({ markets, loading }) => {
        const filteredAndSortedUnifiedMarkets =
          createFilteredAndSortedUnifiedMarkets(markets);

        return (
          <div className="container mx-auto px-2 md:py-8">
            <div className="max-w-6xl mx-auto">
              {/* Tab Toggle, Chain Picker, Sort and Filter */}
              <div className="mb-6">
                {/* Single Row Layout - fits all components when there's space */}
                <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
                  {/* Left Side: Tab Toggle and Chain Picker */}
                  <div className="flex flex-col sm:flex-row gap-4 xl:flex-1">
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

                    <ChainPicker
                      type="multiple"
                      value={selectedChains.map((chain) => chain.id)}
                      onSelectionChange={(value) => {
                        const valueArray = Array.isArray(value)
                          ? value
                          : [value];
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

                  {/* Right Side: Sort Dropdown and Asset Filter */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center xl:shrink-0">
                    {/* Sort Dropdown and Asset Filter - side by side */}
                    <div className="flex gap-4 w-full sm:w-auto">
                      <div className="flex-1 sm:flex-none">
                        <SortDropdown
                          value={sortDropdownValue}
                          onSortChange={handleSortDropdownChange}
                          activeSection={activeTab}
                          activeSubSection={
                            activeTab === "dashboard"
                              ? currentSubsection
                              : activeTab
                          }
                          className="w-full sm:w-32"
                        />
                      </div>
                      <div className="flex-1 sm:flex-none">
                        <AssetFilter
                          value={filters.assetFilter}
                          onChange={handleAssetFilterChange}
                          placeholder="filter by asset (e.g., ETH, BTC)"
                          mobilePlaceholder="filter by asset"
                          className="w-full sm:w-60"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-lg overflow-hidden 2xl:mb-0 mb-12">
                {showWalletConnectionRequired ? (
                  <div className="text-center py-16 md:py-24 px-4 md:px-8">
                    <p className="text-zinc-400 mb-6 px-2 sm:px-8 md:px-16 lg:px-20 text-sm md:text-lg max-w-3xl mx-auto leading-relaxed">
                      please connect an EVM wallet (metamask, etc.) to view and
                      manage your positions. other environments (sui, solana,
                      etc.) are supported; however, presently your positions
                      will only be held and managed on EVM wallets as they will
                      opened and managed on ethereum or other EVM chains.
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
                ) : activeTab === "markets" &&
                  (!filteredAndSortedUnifiedMarkets ||
                    filteredAndSortedUnifiedMarkets.length === 0) ? (
                  <div className="text-center py-16">
                    <div className="text-[#A1A1AA]">no markets found</div>
                  </div>
                ) : (
                  <>
                    {activeTab === "markets" && (
                      <MarketContent
                        unifiedMarkets={filteredAndSortedUnifiedMarkets}
                        tokenTransferState={tokenTransferState}
                        onSupply={handleSupply}
                      />
                    )}
                    {activeTab === "dashboard" && (
                      <DashboardContent
                        userAddress={userWalletAddress}
                        selectedChains={selectedChains}
                        activeMarkets={markets || []}
                        tokenTransferState={tokenTransferState}
                        filters={filters}
                        sortConfig={sortConfig}
                        onSubsectionChange={setCurrentSubsection}
                        onSupply={handleSupply}
                      />
                    )}
                    {activeTab === "history" && (
                      <AggregatedTransactionHistory
                        activeMarkets={markets || []}
                        userWalletAddress={evmAddress(userWalletAddress!)}
                      >
                        {({ transactions, loading }) => (
                          <HistoryContent
                            data={transactions}
                            loading={loading}
                          />
                        )}
                      </AggregatedTransactionHistory>
                    )}
                  </>
                )}
                <Button
                  onClick={() => {
                    console.log(tokenTransferState);
                  }}
                >
                  HELLO MATE
                </Button>
              </div>
            </div>
          </div>
        );
      }}
    </AggregatedMarketData>
  );
}
