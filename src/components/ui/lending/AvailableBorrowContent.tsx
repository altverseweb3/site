"use client";

import React, { useState, useMemo } from "react";
import AvailableBorrowCard from "./AvailableBorrowCard";
import CardsList from "@/components/ui/CardsList";
import { Market } from "@/types/aave";
import { unifyMarkets } from "@/utils/lending/unifyMarkets";

interface AvailableBorrowContentProps {
  markets: Market[] | null | undefined;
  showZeroBalance?: boolean;
}

const ITEMS_PER_PAGE = 10;

const AvailableBorrowContent: React.FC<AvailableBorrowContentProps> = ({
  markets,
  showZeroBalance = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and process markets for borrowing
  const availableBorrowMarkets = useMemo(() => {
    if (!markets || markets.length === 0) return [];

    const unifiedMarkets = unifyMarkets(markets);

    // Filter markets suitable for borrowing
    return unifiedMarkets
      .filter((market) => {
        // Calculate available liquidity
        const totalSuppliedUsd = market.supplyData.totalSuppliedUsd || 0;
        const totalBorrowedUsd = market.borrowData.totalBorrowedUsd || 0;
        const availableUsd = totalSuppliedUsd - totalBorrowedUsd;

        // Only show markets with available liquidity (unless showZeroBalance is true)
        if (!showZeroBalance && availableUsd <= 0) {
          return false;
        }

        // Optionally filter out disabled borrowing markets for cleaner UX
        // For now, we'll show them but they'll be disabled in the card
        return true;
      })
      .sort((a, b) => {
        // First sort by available liquidity (highest first)
        const aAvailable =
          (a.supplyData.totalSuppliedUsd || 0) -
          (a.borrowData.totalBorrowedUsd || 0);
        const bAvailable =
          (b.supplyData.totalSuppliedUsd || 0) -
          (b.borrowData.totalBorrowedUsd || 0);

        if (aAvailable !== bAvailable) {
          return bAvailable - aAvailable;
        }

        // Then sort by borrow APY (lowest first - better for borrowers)
        const aBorrowAPY = a.borrowData.apy || 0;
        const bBorrowAPY = b.borrowData.apy || 0;
        return aBorrowAPY - bBorrowAPY;
      });
  }, [markets, showZeroBalance]);

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
          {showZeroBalance
            ? "no borrow opportunities available"
            : "no borrow opportunities with available liquidity"}
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
          market={market}
          onBorrow={() => {
            // TODO: Implement borrow modal/flow
            console.log("Borrow clicked for:", market.underlyingToken.symbol);
          }}
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
