"use client";

import { useState, useEffect } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import { Info } from "lucide-react";
import {
  UnifiedReserveData,
  AggregatedUserState,
  UserBorrowData,
  UserSupplyData,
} from "@/types/aave";
import { formatHealthFactor } from "@/utils/formatters";
import UserSupplyContent from "@/components/ui/lending/UserContent/UserSupplyContent";
import UserBorrowContent from "@/components/ui/lending/UserContent/UserBorrowContent";
import AvailableSupplyContent from "@/components/ui/lending/AvailableContent/AvailableSupplyContent";
import AvailableBorrowContent from "@/components/ui/lending/AvailableContent/AvailableBorrowContent";
import RiskDetailsModal from "@/components/ui/lending/DashboardContent/RiskDetailsModal";
import EmodeModal from "@/components/ui/lending/ActionModals/EmodeModal";
import { TokenTransferState } from "@/types/web3";
import { LendingFilters, LendingSortConfig } from "@/types/lending";

interface DashboardContentProps {
  userAddress: string;
  unifiedReserves: UnifiedReserveData[];
  marketBorrowData: Record<string, UserBorrowData>;
  marketSupplyData: Record<string, UserSupplyData>;
  aggregatedUserState: AggregatedUserState;
  loading: boolean;
  error: boolean;
  tokenTransferState: TokenTransferState;
  filters?: LendingFilters;
  sortConfig?: LendingSortConfig | null;
  onSubsectionChange?: (subsection: string) => void;
  refetchMarkets?: () => void;
  actions: {
    onCollateralToggle: (market: UnifiedReserveData) => void;
  };
}

export default function DashboardContent({
  userAddress,
  unifiedReserves,
  marketBorrowData,
  marketSupplyData,
  aggregatedUserState,
  loading,
  error,
  tokenTransferState,
  filters,
  sortConfig,
  onSubsectionChange,
  refetchMarkets,
  actions,
}: DashboardContentProps) {
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

  // Show loading state
  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">loading dashboard data...</div>
      </div>
    );
  }

  // Show error state
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
            {aggregatedUserState.healthFactorData.show && (
              <button
                onClick={() => setIsRiskDetailsModalOpen(true)}
                className="px-2 py-0.5 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] rounded text-xs text-white"
              >
                risk details
              </button>
            )}
          </div>
          <div
            className={`grid ${aggregatedUserState.healthFactorData.show ? "grid-cols-3" : "grid-cols-2"} gap-3`}
          >
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">net worth</div>
              <div className="text-sm font-semibold text-white">
                {aggregatedUserState.globalData.netWorth}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">net APY</div>
              <div className="text-sm font-semibold text-green-400">
                {aggregatedUserState.globalData.netAPY}
              </div>
            </div>
            {aggregatedUserState.healthFactorData.show && (
              <div className="text-center">
                <div className="text-xs text-[#A1A1AA] mb-1">health factor</div>
                <div
                  className={`text-sm font-semibold ${formatHealthFactor(aggregatedUserState.healthFactorData.value).colorClass}`}
                >
                  {
                    formatHealthFactor(
                      aggregatedUserState.healthFactorData.value,
                    ).value
                  }
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
              e-mode: {aggregatedUserState.eModeStatus}
            </button>
          </div>
          <div
            className={`grid ${isSupplyMode || aggregatedUserState.globalBorrowData.borrowPercentUsed ? "grid-cols-3" : "grid-cols-2"} gap-3`}
          >
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">
                {isSupplyMode ? "balance" : "debt"}
              </div>
              <div className="text-sm font-semibold text-white">
                {isSupplyMode
                  ? aggregatedUserState.globalSupplyData.balance
                  : aggregatedUserState.globalBorrowData.debt}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">APY</div>
              <div
                className={`text-sm font-semibold ${isSupplyMode ? "text-green-400" : "text-red-400"}`}
              >
                {isSupplyMode
                  ? aggregatedUserState.globalSupplyData.apy
                  : aggregatedUserState.globalBorrowData.apy}
              </div>
            </div>
            {(isSupplyMode ||
              aggregatedUserState.globalBorrowData.borrowPercentUsed) && (
              <div className="text-center">
                <div className="text-xs text-[#A1A1AA] mb-1">
                  {isSupplyMode ? "collateral" : "borrow % used"}
                </div>
                <div
                  className={`text-sm font-semibold ${isSupplyMode ? "text-white" : "text-orange-400"}`}
                >
                  {isSupplyMode
                    ? aggregatedUserState.globalSupplyData.collateral
                    : aggregatedUserState.globalBorrowData.borrowPercentUsed}
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
            {isSupplyMode && showAvailable ? (
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
            ) : !isSupplyMode && showAvailable ? (
              <div className="flex items-center space-x-1 text-sky-500">
                <Info className="w-5 h-5" />
                <span className="text-xs pl-1 sm:pl-0">
                  to borrow you need to supply assets to be used as collateral
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Positions Content */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        {showAvailable ? (
          // Show available positions
          isSupplyMode ? (
            <AvailableSupplyContent
              markets={unifiedReserves}
              userAddress={userAddress}
              showZeroBalance={showZeroBalance}
              tokenTransferState={tokenTransferState}
              filters={filters}
              sortConfig={sortConfig}
            />
          ) : (
            <AvailableBorrowContent
              markets={unifiedReserves}
              userAddress={userAddress}
              tokenTransferState={tokenTransferState}
              filters={filters}
              sortConfig={sortConfig}
            />
          )
        ) : // Show open positions
        isSupplyMode ? (
          <UserSupplyContent
            markets={unifiedReserves}
            userAddress={userAddress}
            tokenTransferState={tokenTransferState}
            filters={filters}
            sortConfig={sortConfig}
            onCollateralToggle={actions.onCollateralToggle}
          />
        ) : (
          <UserBorrowContent
            markets={unifiedReserves}
            userAddress={userAddress}
            tokenTransferState={tokenTransferState}
            filters={filters}
            sortConfig={sortConfig}
          />
        )}
      </div>

      {/* Risk Details Modal */}
      <RiskDetailsModal
        isOpen={isRiskDetailsModalOpen}
        onClose={() => setIsRiskDetailsModalOpen(false)}
        marketRiskData={aggregatedUserState.marketRiskData}
        borrowMarketData={aggregatedUserState.globalBorrowData.marketData}
      />

      {/* E-Mode Modal */}
      <EmodeModal
        isOpen={isEmodeModalOpen}
        onClose={() => setIsEmodeModalOpen(false)}
        unifiedReserves={unifiedReserves}
        marketBorrowData={marketBorrowData}
        marketSupplyData={marketSupplyData}
        userAddress={userAddress}
        refetchMarkets={refetchMarkets}
      />
    </div>
  );
}
