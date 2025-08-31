"use client";

import React, { useState } from "react";
import AvailableBorrowCard from "@/components/ui/lending/AvailableBorrowCard";
import CardsList from "@/components/ui/CardsList";
import { Market } from "@/types/aave";
import { unifyMarkets } from "@/utils/lending/unifyMarkets";

interface AvailableBorrowContentProps {
  markets: Market[] | null | undefined;
}

const ITEMS_PER_PAGE = 10;

const AvailableBorrowContent: React.FC<AvailableBorrowContentProps> = ({
  markets,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const unifiedMarkets = unifyMarkets(markets!);
  const availableBorrowMarkets = unifiedMarkets.filter((market) => {
    // Filter out disabled markets
    return (
      !market.isFrozen &&
      !market.isPaused &&
      market.borrowInfo?.borrowingState === "ENABLED"
    );
  });

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
