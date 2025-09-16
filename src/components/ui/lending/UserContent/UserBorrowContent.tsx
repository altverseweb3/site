"use client";
import React, { useState } from "react";
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
  onBorrow: (market: UnifiedReserveData) => void;
  onRepay: (market: UnifiedReserveData, max: boolean) => void;
}

const ITEMS_PER_PAGE = 10;

const UserBorrowContent: React.FC<UserBorrowContentProps> = ({
  markets,
  userAddress,
  tokenTransferState,
  filters,
  sortConfig,
  onBorrow,
  onRepay,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

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
  let userBorrowReserves: UnifiedReserveData[];
  if (sortConfig) {
    userBorrowReserves = [...filteredReserves].sort((a, b) => {
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

      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  } else {
    // Default sort by debt amount (highest first)
    userBorrowReserves = filteredReserves.sort((a, b) => {
      const balanceA = parseFloat(a.userBorrowPositions[0].debt.usd) || 0;
      const balanceB = parseFloat(b.userBorrowPositions[0].debt.usd) || 0;
      return balanceB - balanceA;
    });
  }

  if (userBorrowReserves.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA] text-sm">
          your borrow positions will be displayed here
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(userBorrowReserves.length / ITEMS_PER_PAGE);
  const paginatedReserves = userBorrowReserves.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <CardsList
      data={paginatedReserves}
      renderCard={(reserve) => (
        <UserBorrowCard
          key={`${reserve.market.address}-${reserve.underlyingToken.address}`}
          unifiedReserve={reserve}
          userAddress={userAddress}
          onBorrow={onBorrow}
          onRepay={onRepay}
          tokenTransferState={tokenTransferState}
        />
      )}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      itemsPerPage={ITEMS_PER_PAGE}
      totalItems={userBorrowReserves.length}
    />
  );
};

export default UserBorrowContent;
