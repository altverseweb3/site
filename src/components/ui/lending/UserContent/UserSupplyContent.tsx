"use client";

import React, { useState } from "react";
import UserSupplyCard from "@/components/ui/lending/UserContent/UserSupplyCard";
import CardsList from "@/components/ui/CardsList";
import { UnifiedReserveData } from "@/types/aave";
import { TokenTransferState } from "@/types/web3";
import { LendingFilters, LendingSortConfig } from "@/types/lending";

interface UserSupplyContentProps {
  markets: UnifiedReserveData[];
  userAddress: string | undefined;
  tokenTransferState: TokenTransferState;
  filters?: LendingFilters;
  sortConfig?: LendingSortConfig | null;
  onSupply: (market: UnifiedReserveData) => void;
  onBorrow: (market: UnifiedReserveData) => void;
  onWithdraw: (market: UnifiedReserveData, max: boolean) => void;
  onCollateralToggle: (market: UnifiedReserveData) => void;
}

const ITEMS_PER_PAGE = 10;

const UserSupplyContent: React.FC<UserSupplyContentProps> = ({
  markets,
  userAddress,
  tokenTransferState,
  filters,
  sortConfig,
  onSupply,
  onBorrow,
  onWithdraw,
  onCollateralToggle,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Apply asset filter
  let filteredReserves = markets.filter(
    (market) => market.userSupplyPositions.length > 0,
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
  let userSupplyReserves: UnifiedReserveData[];
  if (sortConfig) {
    userSupplyReserves = [...filteredReserves].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortConfig.column) {
        case "supplyApy":
          aValue = parseFloat(a.supplyInfo.apy.value) || 0;
          bValue = parseFloat(b.supplyInfo.apy.value) || 0;
          break;
        case "userSuppliedValue":
          aValue = parseFloat(a.userSupplyPositions[0]?.balance.usd) || 0;
          bValue = parseFloat(b.userSupplyPositions[0]?.balance.usd) || 0;
          break;
        default:
          // Default sort by supplied value (highest first)
          aValue = parseFloat(a.userSupplyPositions[0]?.balance.usd) || 0;
          bValue = parseFloat(b.userSupplyPositions[0]?.balance.usd) || 0;
          break;
      }

      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  } else {
    // Default sort by balance (highest first)
    userSupplyReserves = filteredReserves.sort((a, b) => {
      const balanceA = parseFloat(a.userSupplyPositions[0]?.balance.usd) || 0;
      const balanceB = parseFloat(b.userSupplyPositions[0]?.balance.usd) || 0;
      return balanceB - balanceA;
    });
  }

  if (userSupplyReserves.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA] text-sm">
          your supply positions will be displayed here
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(userSupplyReserves.length / ITEMS_PER_PAGE);
  const paginatedReserves = userSupplyReserves.slice(
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
        <UserSupplyCard
          key={`${reserve.market.address}-${reserve.underlyingToken.address}`}
          unifiedReserve={reserve}
          userAddress={userAddress}
          onSupply={onSupply}
          onBorrow={onBorrow}
          onWithdraw={onWithdraw}
          onCollateralToggle={onCollateralToggle}
          tokenTransferState={tokenTransferState}
        />
      )}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      itemsPerPage={ITEMS_PER_PAGE}
      totalItems={userSupplyReserves.length}
    />
  );
};

export default UserSupplyContent;
