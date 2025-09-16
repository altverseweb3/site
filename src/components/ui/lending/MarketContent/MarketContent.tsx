"use client";

import React, { useState, useMemo } from "react";
import MarketCard from "@/components/ui/lending/MarketContent/MarketCard";
import CardsList from "@/components/ui/CardsList";
import {
  UnifiedReserveData,
  UserBorrowData,
  UserBorrowPosition,
  UserSupplyData,
  UserSupplyPosition,
} from "@/types/aave";
import { TokenTransferState } from "@/types/web3";
import { LendingFilters, LendingSortConfig } from "@/types/lending";

const ITEMS_PER_PAGE = 10;

interface MarketContentProps {
  unifiedReserves: UnifiedReserveData[] | null | undefined;
  marketBorrowData?: Record<string, UserBorrowData>;
  marketSupplyData?: Record<string, UserSupplyData>;
  tokenTransferState: TokenTransferState;
  filters: LendingFilters;
  sortConfig: LendingSortConfig | null;
  userAddress: string | undefined;
}

const MarketContent: React.FC<MarketContentProps> = ({
  unifiedReserves,
  userAddress,
  tokenTransferState,

  filters,
  sortConfig,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Apply filtering and sorting to unified markets
  const filteredAndSortedMarkets = useMemo(() => {
    if (!unifiedReserves) return null;

    let filtered = unifiedReserves;

    // Filter by asset
    if (filters.assetFilter) {
      const filterLower = filters.assetFilter.toLowerCase();
      filtered = unifiedReserves.filter((market) => {
        return (
          market.underlyingToken.symbol.toLowerCase().includes(filterLower) ||
          market.underlyingToken.name.toLowerCase().includes(filterLower) ||
          market.marketName.toLowerCase().includes(filterLower)
        );
      });
    }

    // Sort unified markets
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: number;
        let bValue: number;

        switch (sortConfig.column) {
          case "supplyApy":
            aValue = a.supplyData.apy;
            bValue = b.supplyData.apy;
            break;
          case "borrowApy":
            aValue = a.borrowData.apy;
            bValue = b.borrowData.apy;
            break;
          case "suppliedMarketCap":
            aValue = a.supplyData.totalSuppliedUsd;
            bValue = b.supplyData.totalSuppliedUsd;
            break;
          case "borrowedMarketCap":
            aValue = a.borrowData.totalBorrowedUsd;
            bValue = b.borrowData.totalBorrowedUsd;
            break;
          default:
            aValue = 0;
            bValue = 0;
        }

        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      });
    }

    return filtered;
  }, [unifiedReserves, filters, sortConfig]);

  if (!filteredAndSortedMarkets || filteredAndSortedMarkets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">no markets found</div>
      </div>
    );
  }

  const totalPages = Math.ceil(
    filteredAndSortedMarkets.length / ITEMS_PER_PAGE,
  );
  const paginatedMarkets = filteredAndSortedMarkets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <CardsList
      className="bg-[#1F1F23]"
      data={paginatedMarkets}
      renderCard={(market) => (
        <MarketCard
          key={`${market.marketInfo.address}-${market.underlyingToken.address}`}
          market={market}
          userAddress={userAddress}
          onRepay={(market: UserBorrowPosition) => {
            console.log(market); // TODO: update me
          }}
          onWithdraw={(market: UserSupplyPosition) => {
            console.log(market); // TODO: update me
          }}
          tokenTransferState={tokenTransferState}
        />
      )}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      itemsPerPage={ITEMS_PER_PAGE}
      totalItems={filteredAndSortedMarkets.length}
    />
  );
};

export default MarketContent;
