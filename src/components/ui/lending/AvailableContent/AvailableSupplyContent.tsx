"use client";

import React, { useState } from "react";
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
  onSupply: (market: UnifiedReserveData) => void;
  onBorrow: (market: UnifiedReserveData) => void;
}

const ITEMS_PER_PAGE = 10;

const AvailableSupplyContent: React.FC<AvailableSupplyContentProps> = ({
  markets,
  userAddress,
  showZeroBalance = false,
  tokenTransferState,
  filters,
  sortConfig,
  onSupply,
  onBorrow,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  let availableSupplyMarkets = markets.filter((market) => {
    if (showZeroBalance) return true;
    if (!market.userState) return false;
    const userBalance = parseFloat(market.userState.balance.amount.value) || 0;
    return userBalance > 0;
  });

  // Apply asset filter
  if (filters?.assetFilter) {
    const filterLower = filters.assetFilter.toLowerCase();
    availableSupplyMarkets = availableSupplyMarkets.filter((market) => {
      return (
        market.underlyingToken.symbol.toLowerCase().includes(filterLower) ||
        market.underlyingToken.name.toLowerCase().includes(filterLower) ||
        market.marketName.toLowerCase().includes(filterLower)
      );
    });
  }

  // Apply sorting
  if (sortConfig) {
    availableSupplyMarkets = [...availableSupplyMarkets].sort((a, b) => {
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

      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  } else {
    // Default sort by supply APY (descending)
    availableSupplyMarkets = [...availableSupplyMarkets].sort((a, b) => {
      const aSupplyAPY = a.supplyData.apy || 0;
      const bSupplyAPY = b.supplyData.apy || 0;
      return bSupplyAPY - aSupplyAPY;
    });
  }

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

  const totalPages = Math.ceil(availableSupplyMarkets.length / ITEMS_PER_PAGE);
  const paginatedMarkets = availableSupplyMarkets.slice(
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
        <AvailableSupplyCard
          key={`${market.marketInfo.address}-${market.underlyingToken.address}`}
          market={market}
          userAddress={userAddress}
          onSupply={onSupply}
          onBorrow={onBorrow}
          tokenTransferState={tokenTransferState}
        />
      )}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      itemsPerPage={ITEMS_PER_PAGE}
      totalItems={availableSupplyMarkets.length}
    />
  );
};

export default AvailableSupplyContent;
