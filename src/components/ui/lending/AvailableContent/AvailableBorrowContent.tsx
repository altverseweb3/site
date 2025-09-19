"use client";

import React, { useMemo } from "react";
import AvailableBorrowCard from "@/components/ui/lending/AvailableContent/AvailableBorrowCard";
import CardsList from "@/components/ui/CardsList";
import { UnifiedReserveData } from "@/types/aave";
import { TokenTransferState } from "@/types/web3";
import { LendingFilters, LendingSortConfig } from "@/types/lending";

interface AvailableBorrowContentProps {
  markets: UnifiedReserveData[];
  userAddress: string | undefined;
  tokenTransferState: TokenTransferState;
  filters?: LendingFilters;
  sortConfig?: LendingSortConfig | null;
  refetchMarkets: () => void;
}

const AvailableBorrowContent: React.FC<AvailableBorrowContentProps> = ({
  markets,
  userAddress,
  tokenTransferState,
  filters,
  sortConfig,
  refetchMarkets,
}) => {
  // Apply filtering and sorting with useMemo for performance
  const availableBorrowMarkets = useMemo(() => {
    let filtered = markets.filter((market) => {
      // Filter out disabled markets
      return (
        !market.isFrozen &&
        !market.isPaused &&
        market.borrowInfo?.borrowingState === "ENABLED"
      );
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
          case "borrowApy":
            aValue = a.borrowData.apy;
            bValue = b.borrowData.apy;
            break;
          case "borrowAvailable":
            // Use available liquidity for borrow available
            aValue = a.borrowInfo?.availableLiquidity?.usd || 0;
            bValue = b.borrowInfo?.availableLiquidity?.usd || 0;
            break;
          default:
            // Default sort by borrow APY (ascending - lower is better for borrowing)
            aValue = a.borrowData.apy;
            bValue = b.borrowData.apy;
            break;
        }

        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      });
    } else {
      // Default sort by borrow APY (ascending - lower is better for borrowing)
      return [...filtered].sort((a, b) => {
        const aBorrowAPY = a.borrowData.apy || 0;
        const bBorrowAPY = b.borrowData.apy || 0;
        return aBorrowAPY - bBorrowAPY;
      });
    }
  }, [markets, filters, sortConfig]);

  if (!markets || markets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA] text-sm">no markets found</div>
      </div>
    );
  }

  if (availableBorrowMarkets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA] text-sm">
          no borrow opportunities available
        </div>
      </div>
    );
  }

  return (
    <CardsList
      data={availableBorrowMarkets}
      renderCard={(market) => (
        <AvailableBorrowCard
          key={`${market.marketInfo.address}-${market.underlyingToken.address}`}
          reserve={market}
          userAddress={userAddress}
          tokenTransferState={tokenTransferState}
          refetchMarkets={refetchMarkets}
        />
      )}
    />
  );
};

export default AvailableBorrowContent;
