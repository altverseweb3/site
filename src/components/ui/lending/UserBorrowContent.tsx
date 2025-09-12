"use client";
import React, { useState } from "react";
import UserBorrowCard from "@/components/ui/lending/UserBorrowCard";
import CardsList from "@/components/ui/CardsList";
import {
  UserBorrowData,
  UserBorrowPosition,
  Market,
  UnifiedMarketData,
} from "@/types/aave";
import { unifyMarkets } from "@/utils/lending/unifyMarkets";
import { TokenTransferState } from "@/types/web3";
import { LendingFilters, LendingSortConfig } from "@/types/lending";

interface UserBorrowContentProps {
  marketBorrowData: Record<string, UserBorrowData>;
  activeMarkets: Market[];
  showZeroBalance?: boolean;
  tokenTransferState: TokenTransferState;
  filters?: LendingFilters;
  sortConfig?: LendingSortConfig | null;
  onSupply: (market: UnifiedMarketData) => void;
  onBorrow: (market: UnifiedMarketData) => void;
  onRepay: (market: UnifiedMarketData, max: boolean) => void;
}

interface EnhancedUserBorrowPosition extends UserBorrowPosition {
  unifiedMarket: UnifiedMarketData;
}

const ITEMS_PER_PAGE = 10;

const UserBorrowContent: React.FC<UserBorrowContentProps> = ({
  marketBorrowData,
  activeMarkets,
  showZeroBalance = false,
  tokenTransferState,
  filters,
  sortConfig,
  onSupply,
  onBorrow,
  onRepay,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const unifiedMarkets = unifyMarkets(activeMarkets);

  // lookup map for unified markets by currency address and chain
  const unifiedMarketMap = new Map<string, UnifiedMarketData>();
  unifiedMarkets.forEach((market) => {
    const key = `${market.underlyingToken.address.toLowerCase()}-${market.marketInfo.chain.chainId}`;
    unifiedMarketMap.set(key, market);
  });

  const enhancedPositions: EnhancedUserBorrowPosition[] = [];

  Object.values(marketBorrowData).forEach((marketData) => {
    if (marketData.borrows && marketData.borrows.length > 0) {
      marketData.borrows.forEach((borrow) => {
        const currencyKey = `${borrow.currency.address.toLowerCase()}-${marketData.chainId}`;
        const unifiedMarket = unifiedMarketMap.get(currencyKey);

        if (unifiedMarket) {
          const debtAmount = parseFloat(borrow.debt.usd) || 0;
          if (!showZeroBalance && debtAmount === 0) {
            return;
          }

          enhancedPositions.push({
            marketAddress: marketData.marketAddress,
            marketName: marketData.marketName,
            chainId: marketData.chainId,
            borrow,
            unifiedMarket,
          });
        }
      });
    }
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
          onSupply={onSupply}
          onBorrow={onBorrow}
          onRepay={onRepay}
          tokenTransferState={tokenTransferState}
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
