"use client";
import React, { useState } from "react";
import UserBorrowCard from "@/components/ui/lending/UserContent/UserBorrowCard";
import CardsList from "@/components/ui/CardsList";
import { UserBorrowPosition, UnifiedMarketData } from "@/types/aave";
import { TokenTransferState } from "@/types/web3";
import { LendingFilters, LendingSortConfig } from "@/types/lending";
import {
  HealthFactorPreviewArgs,
  HealthFactorPreviewResult,
} from "@/hooks/lending/useHealthFactorPreviewOperations";

interface UserBorrowContentProps {
  markets: UnifiedMarketData[];
  userAddress: string | undefined;
  showZeroBalance?: boolean;
  tokenTransferState: TokenTransferState;
  filters?: LendingFilters;
  sortConfig?: LendingSortConfig | null;
  onSupply: (market: UnifiedMarketData) => void;
  onBorrow: (market: UnifiedMarketData) => void;
  onRepay: (market: UnifiedMarketData, max: boolean) => void;
  onHealthFactorPreview?: (
    args: HealthFactorPreviewArgs,
  ) => Promise<HealthFactorPreviewResult>;
}

interface EnhancedUserBorrowPosition extends UserBorrowPosition {
  unifiedMarket: UnifiedMarketData;
}

const ITEMS_PER_PAGE = 10;

const UserBorrowContent: React.FC<UserBorrowContentProps> = ({
  markets,
  userAddress,
  showZeroBalance = false,
  tokenTransferState,
  filters,
  sortConfig,
  onSupply,
  onBorrow,
  onRepay,
  onHealthFactorPreview,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const enhancedPositions: EnhancedUserBorrowPosition[] = [];

  markets.forEach((market) => {
    market.userBorrowPositions.forEach((borrow) => {
      const debtAmount = parseFloat(borrow.debt.usd) || 0;
      if (!showZeroBalance && debtAmount === 0) {
        return;
      }

      enhancedPositions.push({
        marketAddress: market.marketInfo.address,
        marketName: market.marketName,
        chainId: market.marketInfo.chain.chainId,
        borrow,
        unifiedMarket: market,
      });
    });
  });

  // Apply asset filter
  let filteredPositions = enhancedPositions;
  if (filters?.assetFilter) {
    const filterLower = filters.assetFilter.toLowerCase();
    filteredPositions = enhancedPositions.filter((position) => {
      return (
        // Filter by title (underlyingToken.name)
        position.unifiedMarket.underlyingToken.name
          .toLowerCase()
          .includes(filterLower) ||
        // Filter by ticker (currency.symbol)
        position.borrow.currency.symbol.toLowerCase().includes(filterLower) ||
        // Also include market name for broader matching
        position.marketName.toLowerCase().includes(filterLower)
      );
    });
  }

  // Apply sorting
  let userBorrowPositions: EnhancedUserBorrowPosition[];
  if (sortConfig) {
    userBorrowPositions = [...filteredPositions].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortConfig.column) {
        case "borrowApy":
          aValue = parseFloat(a.borrow.apy.value) || 0;
          bValue = parseFloat(b.borrow.apy.value) || 0;
          break;
        case "userBorrowedValue":
          aValue = parseFloat(a.borrow.debt.usd) || 0;
          bValue = parseFloat(b.borrow.debt.usd) || 0;
          break;
        default:
          // Default sort by borrowed value (highest first)
          aValue = parseFloat(a.borrow.debt.usd) || 0;
          bValue = parseFloat(b.borrow.debt.usd) || 0;
          break;
      }

      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  } else {
    // Default sort by debt amount (highest first)
    userBorrowPositions = filteredPositions.sort((a, b) => {
      const balanceA = parseFloat(a.borrow.debt.usd) || 0;
      const balanceB = parseFloat(b.borrow.debt.usd) || 0;
      return balanceB - balanceA;
    });
  }

  if (userBorrowPositions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA] text-sm">
          your borrow positions will be displayed here
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(userBorrowPositions.length / ITEMS_PER_PAGE);
  const paginatedPositions = userBorrowPositions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <CardsList
      data={paginatedPositions}
      renderCard={(position) => (
        <UserBorrowCard
          key={`${position.marketAddress}-${position.borrow.currency.symbol}`}
          position={position}
          unifiedMarket={position.unifiedMarket}
          userAddress={userAddress}
          onSupply={onSupply}
          onBorrow={onBorrow}
          onRepay={onRepay}
          tokenTransferState={tokenTransferState}
          onHealthFactorPreview={onHealthFactorPreview}
        />
      )}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      itemsPerPage={ITEMS_PER_PAGE}
      totalItems={userBorrowPositions.length}
    />
  );
};

export default UserBorrowContent;
