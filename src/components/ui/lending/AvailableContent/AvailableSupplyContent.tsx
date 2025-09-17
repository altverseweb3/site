"use client";

import React, { useMemo } from "react";
import AvailableSupplyCard from "@/components/ui/lending/AvailableContent/AvailableSupplyCard";
import CardsList from "@/components/ui/CardsList";
import { UnifiedReserveData } from "@/types/aave";
import { TokenTransferState } from "@/types/web3";
import { LendingFilters, LendingSortConfig } from "@/types/lending";

interface AvailableSupplyContentProps {
  markets: UnifiedReserveData[];
  userAddress: string | undefined;
  showZeroBalance?: boolean;
  tokenTransferState: TokenTransferState;
  filters?: LendingFilters;
  sortConfig?: LendingSortConfig | null;
  refetchMarkets: () => void;
}

const AvailableSupplyContent: React.FC<AvailableSupplyContentProps> = ({
  markets,
  userAddress,
  showZeroBalance = false,
  tokenTransferState,
  filters,
  sortConfig,
  refetchMarkets,
}) => {
  // Apply filtering and sorting with useMemo for performance
  const availableSupplyMarkets = useMemo(() => {
    let filtered = markets.filter((market) => {
      if (showZeroBalance) return true;
      if (!market.userState) return false;
      const userBalance =
        parseFloat(market.userState.balance.amount.value) || 0;
      return userBalance > 0;
    });

    // Apply asset filter
    if (filters?.assetFilter) {
      const filterLower = filters.assetFilter.toLowerCase();
      filtered = filtered.filter((market) => {
        return (
          market.underlyingToken.symbol.toLowerCase().includes(filterLower) ||
          market.underlyingToken.name.toLowerCase().includes(filterLower) ||
          market.marketName.toLowerCase().includes(filterLower)
        );
      });
    }

    // Apply sorting
    if (sortConfig) {
      return [...filtered].sort((a, b) => {
        let aValue: number;
        let bValue: number;

        switch (sortConfig.column) {
          case "supplyApy":
            aValue = a.supplyData.apy;
            bValue = b.supplyData.apy;
            break;
          case "suppliedMarketCap":
            aValue = a.supplyData.totalSuppliedUsd;
            bValue = b.supplyData.totalSuppliedUsd;
            break;
          default:
            // Default sort by supply APY (descending)
            aValue = a.supplyData.apy;
            bValue = b.supplyData.apy;
            break;
        }

        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      });
    } else {
      // Default sort by supply APY (descending)
      return [...filtered].sort((a, b) => {
        const aSupplyAPY = a.supplyData.apy || 0;
        const bSupplyAPY = b.supplyData.apy || 0;
        return bSupplyAPY - aSupplyAPY;
      });
    }
  }, [markets, showZeroBalance, filters, sortConfig]);

  if (!markets || markets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA] text-sm">no markets found</div>
      </div>
    );
  }

  if (availableSupplyMarkets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA] text-sm">
          no supply opportunities available
        </div>
      </div>
    );
  }

  return (
    <CardsList
      data={availableSupplyMarkets}
      renderCard={(market) => (
        <AvailableSupplyCard
          key={`${market.marketInfo.address}-${market.underlyingToken.address}`}
          reserve={market}
          userAddress={userAddress}
          tokenTransferState={tokenTransferState}
          refetchMarkets={refetchMarkets}
        />
      )}
      baseRows={2}
    />
  );
};

export default AvailableSupplyContent;
