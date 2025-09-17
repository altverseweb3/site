"use client";
import React, { useMemo } from "react";
import UserBorrowCard from "@/components/ui/lending/UserContent/UserBorrowCard";
import CardsList from "@/components/ui/CardsList";
import { UnifiedReserveData } from "@/types/aave";
import { TokenTransferState } from "@/types/web3";
import { LendingFilters, LendingSortConfig } from "@/types/lending";

interface UserBorrowContentProps {
  markets: UnifiedReserveData[];
  userAddress: string | undefined;
  tokenTransferState: TokenTransferState;
  filters?: LendingFilters;
  sortConfig?: LendingSortConfig | null;
  refetchMarkets: () => void;
}

const UserBorrowContent: React.FC<UserBorrowContentProps> = ({
  markets,
  userAddress,
  tokenTransferState,
  filters,
  sortConfig,
  refetchMarkets,
}) => {
  // Apply filtering and sorting with useMemo for performance
  const userBorrowReserves = useMemo(() => {
    // Apply asset filter
    let filteredReserves = markets.filter(
      (market) => market.userBorrowPositions.length > 0,
    );
    if (filters?.assetFilter) {
      const filterLower = filters.assetFilter.toLowerCase();
      filteredReserves = markets.filter((market) => {
        return (
          // Filter by title (underlyingToken.name)
          market.underlyingToken.name.toLowerCase().includes(filterLower) ||
          // Filter by ticker (currency.symbol)
          market.underlyingToken.symbol.toLowerCase().includes(filterLower) ||
          // Also include market name for broader matching
          market.marketName.toLowerCase().includes(filterLower)
        );
      });
    }

    // Apply sorting
    if (sortConfig) {
      return [...filteredReserves].sort((a, b) => {
        let aValue: number;
        let bValue: number;

        switch (sortConfig.column) {
          case "borrowApy":
            aValue = parseFloat(a.borrowInfo?.apy.value) || 0;
            bValue = parseFloat(b.borrowInfo?.apy.value) || 0;
            break;
          case "userBorrowedValue":
            aValue = parseFloat(a.userBorrowPositions[0].debt.usd) || 0;
            bValue = parseFloat(b.userBorrowPositions[0].debt.usd) || 0;
            break;
          default:
            // Default sort by borrowed value (highest first)
            aValue = parseFloat(a.userBorrowPositions[0].debt.usd) || 0;
            bValue = parseFloat(b.userBorrowPositions[0].debt.usd) || 0;
            break;
        }

        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      });
    } else {
      // Default sort by debt amount (highest first)
      return filteredReserves.sort((a, b) => {
        const balanceA = parseFloat(a.userBorrowPositions[0].debt.usd) || 0;
        const balanceB = parseFloat(b.userBorrowPositions[0].debt.usd) || 0;
        return balanceB - balanceA;
      });
    }
  }, [markets, filters, sortConfig]);

  if (userBorrowReserves.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA] text-sm">
          your borrow positions will be displayed here
        </div>
      </div>
    );
  }

  return (
    <CardsList
      data={userBorrowReserves}
      renderCard={(reserve) => (
        <UserBorrowCard
          key={`${reserve.market.address}-${reserve.underlyingToken.address}`}
          unifiedReserve={reserve}
          userAddress={userAddress}
          tokenTransferState={tokenTransferState}
          refetchMarkets={refetchMarkets}
        />
      )}
      baseRows={2}
    />
  );
};

export default UserBorrowContent;
