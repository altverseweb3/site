"use client";

import React, { useState } from "react";
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
}

const ITEMS_PER_PAGE = 10;

const AvailableBorrowContent: React.FC<AvailableBorrowContentProps> = ({
  markets,
  userAddress,
  tokenTransferState,
  filters,
  sortConfig,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  let availableBorrowMarkets = markets.filter((market) => {
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
    availableBorrowMarkets = availableBorrowMarkets.filter((market) => {
      return (
        market.underlyingToken.symbol.toLowerCase().includes(filterLower) ||
        market.underlyingToken.name.toLowerCase().includes(filterLower) ||
        market.marketName.toLowerCase().includes(filterLower)
      );
    });
  }

  // Apply sorting
  if (sortConfig) {
    availableBorrowMarkets = [...availableBorrowMarkets].sort((a, b) => {
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

      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  } else {
    // Default sort by borrow APY (ascending - lower is better for borrowing)
    availableBorrowMarkets = [...availableBorrowMarkets].sort((a, b) => {
      const aBorrowAPY = a.borrowData.apy || 0;
      const bBorrowAPY = b.borrowData.apy || 0;
      return aBorrowAPY - bBorrowAPY;
    });
  }

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

  const totalPages = Math.ceil(availableBorrowMarkets.length / ITEMS_PER_PAGE);
  const paginatedMarkets = availableBorrowMarkets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <CardsList
      data={paginatedMarkets}
      renderCard={(market) => (
        <AvailableBorrowCard
          key={`${market.marketInfo.address}-${market.underlyingToken.address}`}
          reserve={market}
          userAddress={userAddress}
          tokenTransferState={tokenTransferState}
        />
      )}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      itemsPerPage={ITEMS_PER_PAGE}
      totalItems={availableBorrowMarkets.length}
    />
  );
};

export default AvailableBorrowContent;
