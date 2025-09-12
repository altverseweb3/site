"use client";

import { useState, useEffect } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import { Info } from "lucide-react";
import { evmAddress } from "@aave/react";
import { Chain } from "@/types/web3";
import {
  ChainId,
  Market,
  EModeStatus,
  UserSupplyData,
  UserBorrowData,
  UnifiedMarketData,
} from "@/types/aave";
import { AggregatedMarketUserState } from "@/components/ui/lending/AggregatedMarketUserState";
import { AggregatedMarketUserSupplies } from "@/components/ui/lending/AggregatedMarketUserSupplies";
import { AggregatedMarketUserBorrows } from "@/components/ui/lending/AggregatedMarketUserBorrows";
import { formatHealthFactor } from "@/utils/formatters";
import UserSupplyContent from "@/components/ui/lending/UserSupplyContent";
import UserBorrowContent from "@/components/ui/lending/UserBorrowContent";
import AvailableSupplyContent from "@/components/ui/lending/AvailableSupplyContent";
import AvailableBorrowContent from "@/components/ui/lending/AvailableBorrowContent";
import RiskDetailsModal from "@/components/ui/lending/RiskDetailsModal";
import EmodeModal from "@/components/ui/lending/EmodeModal";
import { TokenTransferState } from "@/types/web3";
import { LendingFilters, LendingSortConfig } from "@/types/lending";

interface DashboardContentProps {
  userAddress?: string;
  selectedChains: Chain[];
  activeMarkets: Market[];
  tokenTransferState: TokenTransferState;
  filters?: LendingFilters;
  sortConfig?: LendingSortConfig | null;
  onSubsectionChange?: (subsection: string) => void;
  onSupply: (market: UnifiedMarketData) => void;
  onBorrow: (market: UnifiedMarketData) => void;
  onWithdraw: (market: UnifiedMarketData) => void;
  refetchMarkets?: () => void;
}

export default function DashboardContent({
  userAddress,
  activeMarkets,
  tokenTransferState,
  filters,
  sortConfig,
  onSubsectionChange,
  onSupply,
  onBorrow,
  onWithdraw,
  refetchMarkets,
}: DashboardContentProps) {
  if (!userAddress) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">wallet not connected</div>
      </div>
    );
  }

  return (
    <AggregatedMarketUserState
      activeMarkets={activeMarkets}
      userWalletAddress={evmAddress(userAddress)}
    >
      {({
        globalData,
        healthFactorData,
        eModeStatus,
        borrowData,
        marketRiskData,
        loading,
        error,
      }) => (
        <AggregatedMarketUserSupplies
          activeMarkets={activeMarkets}
          userWalletAddress={evmAddress(userAddress)}
        >
          {({
            supplyData,
            loading: supplyLoading,
            error: supplyError,
            marketSupplyData,
          }) => (
            <AggregatedMarketUserBorrows
              activeMarkets={activeMarkets}
              userWalletAddress={evmAddress(userAddress)}
            >
              {({
                borrowData: borrowAPYData,
                loading: borrowLoading,
                error: borrowError,
                marketBorrowData,
              }) => {
                return (
                  <DashboardContentInner
                    globalData={globalData}
                    healthFactorData={healthFactorData}
                    eModeStatus={eModeStatus}
                    supplyData={supplyData}
                    marketSupplyData={marketSupplyData}
                    marketBorrowData={marketBorrowData}
                    borrowAPY={borrowAPYData.apy}
                    activeMarkets={activeMarkets}
                    borrowData={borrowData}
                    marketRiskData={marketRiskData}
                    loading={loading || supplyLoading || borrowLoading}
                    error={error || supplyError || borrowError}
                    tokenTransferState={tokenTransferState}
                    userAddress={userAddress}
                    filters={filters}
                    sortConfig={sortConfig}
                    onSubsectionChange={onSubsectionChange}
                    onSupply={onSupply}
                    onBorrow={onBorrow}
                    onWithdraw={onWithdraw}
                    refetchMarkets={refetchMarkets}
                  />
                );
              }}
            </AggregatedMarketUserBorrows>
          )}
        </AggregatedMarketUserSupplies>
      )}
    </AggregatedMarketUserState>
  );
}

interface DashboardContentInnerProps {
  globalData: {
    netWorth: string;
    netAPY: string;
  };
  healthFactorData: {
    show: boolean;
    value: string | null;
  };
  eModeStatus: EModeStatus;
  supplyData: {
    balance: string;
    apy: string;
    collateral: string;
  };
  borrowAPY: string;
  borrowData: {
    debt: string;
    collateral: string;
    borrowPercentUsed: string | null;
    marketData: Record<
      string,
      {
        debt: string;
        collateral: string;
        currentLtv: string | null;
      }
    >;
  };
  marketSupplyData: Record<string, UserSupplyData>;
  marketBorrowData: Record<string, UserBorrowData>;
  marketRiskData: Record<
    string,
    {
      healthFactor: string | null;
      ltv: string | null;
      currentLiquidationThreshold: string | null;
      chainId: ChainId;
      chainName: string;
      chainIcon: string;
      marketName: string;
    }
  >;
  activeMarkets: Market[];
  loading: boolean;
  error: boolean;
  tokenTransferState: TokenTransferState;
  userAddress: string;
  filters?: LendingFilters;
  sortConfig?: LendingSortConfig | null;
  onSubsectionChange?: (subsection: string) => void;
  onSupply: (market: UnifiedMarketData) => void;
  onBorrow: (market: UnifiedMarketData) => void;
  onWithdraw: (market: UnifiedMarketData) => void;
  refetchMarkets?: () => void;
}

function DashboardContentInner({
  globalData,
  healthFactorData,
  eModeStatus,
  supplyData,
  borrowAPY,
  borrowData,
  marketSupplyData,
  marketBorrowData,
  marketRiskData,
  activeMarkets,
  loading,
  error,
  tokenTransferState,
  userAddress,
  filters,
  sortConfig,
  onSubsectionChange,
  onSupply,
  onBorrow,
  onWithdraw,
  refetchMarkets,
}: DashboardContentInnerProps) {
  const [isSupplyMode, setIsSupplyMode] = useState(true);
  const [showAvailable, setShowAvailable] = useState(true);
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [isRiskDetailsModalOpen, setIsRiskDetailsModalOpen] = useState(false);
  const [isEmodeModalOpen, setIsEmodeModalOpen] = useState(false);

  // Notify parent of subsection changes
  useEffect(() => {
    if (onSubsectionChange) {
      const currentSubsection = showAvailable
        ? isSupplyMode
          ? "supply-available"
          : "borrow-available"
        : isSupplyMode
          ? "supply-open"
          : "borrow-open";
      onSubsectionChange(currentSubsection);
    }
  }, [isSupplyMode, showAvailable, onSubsectionChange]);

  // Show loading state if any market is still loading
  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">loading dashboard data...</div>
      </div>
    );
  }

  // Show error state if any market has error
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-400">error loading dashboard data</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Side-by-side Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Global Overview */}
        <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-white">
              global info (selected chains)
            </h3>
            {healthFactorData.show && (
              <button
                onClick={() => setIsRiskDetailsModalOpen(true)}
                className="px-2 py-0.5 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] rounded text-xs text-white"
              >
                risk details
              </button>
            )}
          </div>
          <div
            className={`grid ${healthFactorData.show ? "grid-cols-3" : "grid-cols-2"} gap-3`}
          >
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">net worth</div>
              <div className="text-sm font-semibold text-white">
                {globalData.netWorth}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">net APY</div>
              <div className="text-sm font-semibold text-green-400">
                {globalData.netAPY}
              </div>
            </div>
            {healthFactorData.show && (
              <div className="text-center">
                <div className="text-xs text-[#A1A1AA] mb-1">health factor</div>
                <div
                  className={`text-sm font-semibold ${formatHealthFactor(healthFactorData.value).colorClass}`}
                >
                  {formatHealthFactor(healthFactorData.value).value}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Supply/Borrow Overview */}
        <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-white">
              {isSupplyMode
                ? "supply info (selected chains)"
                : "borrow info (selected chains)"}
            </h3>
            <button
              onClick={() => setIsEmodeModalOpen(true)}
              className={`px-2 py-0.5 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] rounded text-xs text-white ${isSupplyMode ? "invisible" : "visible"}`}
            >
              e-mode: {eModeStatus}
            </button>
          </div>
          <div
            className={`grid ${isSupplyMode || borrowData.borrowPercentUsed ? "grid-cols-3" : "grid-cols-2"} gap-3`}
          >
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">
                {isSupplyMode ? "balance" : "debt"}
              </div>
              <div className="text-sm font-semibold text-white">
                {isSupplyMode ? supplyData.balance : borrowData.debt}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">APY</div>
              <div
                className={`text-sm font-semibold ${isSupplyMode ? "text-green-400" : "text-red-400"}`}
              >
                {isSupplyMode ? supplyData.apy : borrowAPY}
              </div>
            </div>
            {(isSupplyMode || borrowData.borrowPercentUsed) && (
              <div className="text-center">
                <div className="text-xs text-[#A1A1AA] mb-1">
                  {isSupplyMode ? "collateral" : "borrow % used"}
                </div>
                <div
                  className={`text-sm font-semibold ${isSupplyMode ? "text-white" : "text-orange-400"}`}
                >
                  {isSupplyMode
                    ? supplyData.collateral
                    : borrowData.borrowPercentUsed}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Group Above Positions */}
      <div className="space-y-2 mb-4 ml-0.5">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex gap-4">
            <ToggleGroup
              type="single"
              value={isSupplyMode ? "supply" : "borrow"}
              onValueChange={(value) => setIsSupplyMode(value === "supply")}
            >
              <ToggleGroupItem
                value="supply"
                className="data-[state=on]:bg-amber-500/25 data-[state=on]:text-amber-300 data-[state=on]:border-[#61410B]"
              >
                supply
              </ToggleGroupItem>
              <ToggleGroupItem
                value="borrow"
                className="data-[state=on]:bg-amber-500/25 data-[state=on]:text-amber-300 data-[state=on]:border-[#61410B]"
              >
                borrow
              </ToggleGroupItem>
            </ToggleGroup>

            <ToggleGroup
              type="single"
              value={
                showAvailable
                  ? "available"
                  : isSupplyMode
                    ? "supplied"
                    : "borrowed"
              }
              onValueChange={(value) => setShowAvailable(value === "available")}
            >
              <ToggleGroupItem
                value="available"
                className="data-[state=on]:bg-sky-500/25 data-[state=on]:text-sky-300 data-[state=on]:border-sky-800"
              >
                available
              </ToggleGroupItem>
              <ToggleGroupItem
                value={isSupplyMode ? "supplied" : "borrowed"}
                className="data-[state=on]:bg-sky-500/25 data-[state=on]:text-sky-300 data-[state=on]:border-sky-800"
              >
                open
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Conditional Content */}
          <div className="flex items-center">
            {(isSupplyMode && showAvailable) || !isSupplyMode ? (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showZeroBalance}
                  onChange={(e) => setShowZeroBalance(e.target.checked)}
                  className="w-4 h-4 bg-[#27272A] border border-[#3F3F46] rounded text-amber-500"
                />
                <span className="text-xs text-[#A1A1AA]">
                  show assets with 0 balance
                </span>
              </label>
            ) : (
              <div className="flex items-center space-x-1 text-sky-500">
                <Info className="w-5 h-5" />
                <span className="text-xs pl-1 sm:pl-0">
                  to borrow you need to supply assets to be used as collateral
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Positions Content */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        {showAvailable ? (
          // Show available positions
          isSupplyMode ? (
            <AvailableSupplyContent
              markets={activeMarkets}
              showZeroBalance={showZeroBalance}
              tokenTransferState={tokenTransferState}
              filters={filters}
              sortConfig={sortConfig}
              onSupply={onSupply}
              onBorrow={onBorrow}
            />
          ) : (
            <AvailableBorrowContent
              markets={activeMarkets}
              tokenTransferState={tokenTransferState}
              filters={filters}
              sortConfig={sortConfig}
              onSupply={onSupply}
              onBorrow={onBorrow}
            />
          )
        ) : // Show open positions
        isSupplyMode ? (
          <UserSupplyContent
            marketSupplyData={marketSupplyData}
            activeMarkets={activeMarkets}
            tokenTransferState={tokenTransferState}
            filters={filters}
            sortConfig={sortConfig}
            onSupply={onSupply}
            onBorrow={onBorrow}
            onWithdraw={onWithdraw}
          />
        ) : (
          <UserBorrowContent
            marketBorrowData={marketBorrowData}
            showZeroBalance={showZeroBalance}
            activeMarkets={activeMarkets}
            tokenTransferState={tokenTransferState}
            filters={filters}
            sortConfig={sortConfig}
            onSupply={onSupply}
            onBorrow={onBorrow}
          />
        )}
      </div>

      {/* Risk Details Modal */}
      <RiskDetailsModal
        isOpen={isRiskDetailsModalOpen}
        onClose={() => setIsRiskDetailsModalOpen(false)}
        marketRiskData={marketRiskData}
        borrowMarketData={borrowData.marketData}
      />

      {/* E-Mode Modal */}
      <EmodeModal
        isOpen={isEmodeModalOpen}
        onClose={() => setIsEmodeModalOpen(false)}
        activeMarkets={activeMarkets}
        userAddress={userAddress}
        refetchMarkets={refetchMarkets}
        marketBorrowData={marketBorrowData}
      />
    </div>
  );
}
