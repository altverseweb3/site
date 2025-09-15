"use client";

import React, { useState } from "react";
import UserSupplyCard from "@/components/ui/lending/UserContent/UserSupplyCard";
import CardsList from "@/components/ui/CardsList";
import { UserSupplyPosition, UnifiedMarketData } from "@/types/aave";
import { TokenTransferState } from "@/types/web3";
import { LendingFilters, LendingSortConfig } from "@/types/lending";

interface UserSupplyContentProps {
  markets: UnifiedMarketData[];
  userAddress: string | undefined;
  tokenTransferState: TokenTransferState;
  filters?: LendingFilters;
  sortConfig?: LendingSortConfig | null;
  onSupply: (market: UnifiedMarketData) => void;
  onBorrow: (market: UnifiedMarketData) => void;
  onWithdraw: (market: UnifiedMarketData, max: boolean) => void;
  onCollateralToggle: (market: UnifiedMarketData) => void;
}

interface EnhancedUserSupplyPosition extends UserSupplyPosition {
  unifiedMarket: UnifiedMarketData;
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

  const enhancedPositions: EnhancedUserSupplyPosition[] = [];

  markets.forEach((market) => {
    market.userSupplyPositions.forEach((supply) => {
      enhancedPositions.push({
        marketAddress: market.marketInfo.address,
        marketName: market.marketName,
        chainId: market.marketInfo.chain.chainId,
        supply,
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
        position.supply.currency.symbol.toLowerCase().includes(filterLower) ||
        // Also include market name for broader matching
        position.marketName.toLowerCase().includes(filterLower)
      );
    });
  }

  // Apply sorting
  let userSupplyPositions: EnhancedUserSupplyPosition[];
  if (sortConfig) {
    userSupplyPositions = [...filteredPositions].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortConfig.column) {
        case "supplyApy":
          aValue = parseFloat(a.supply.apy.value) || 0;
          bValue = parseFloat(b.supply.apy.value) || 0;
          break;
        case "userSuppliedValue":
          aValue = parseFloat(a.supply.balance.usd) || 0;
          bValue = parseFloat(b.supply.balance.usd) || 0;
          break;
        default:
          // Default sort by supplied value (highest first)
          aValue = parseFloat(a.supply.balance.usd) || 0;
          bValue = parseFloat(b.supply.balance.usd) || 0;
          break;
      }

      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  } else {
    // Default sort by balance (highest first)
    userSupplyPositions = filteredPositions.sort((a, b) => {
      const balanceA = parseFloat(a.supply.balance.usd) || 0;
      const balanceB = parseFloat(b.supply.balance.usd) || 0;
      return balanceB - balanceA;
    });
  }

  if (userSupplyPositions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA] text-sm">
          your supply positions will be displayed here
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(userSupplyPositions.length / ITEMS_PER_PAGE);
  const paginatedPositions = userSupplyPositions.slice(
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
        <UserSupplyCard
          key={`${position.marketAddress}-${position.supply.currency.symbol}`}
          position={position}
          unifiedMarket={position.unifiedMarket}
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
      totalItems={userSupplyPositions.length}
    />
  );
};

export default UserSupplyContent;
