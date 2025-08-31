"use client";

import React, { useState } from "react";
import MarketCard from "@/components/ui/lending/MarketCard";
import CardsList from "@/components/ui/CardsList";
import { Market } from "@/types/aave";
import { unifyMarkets } from "@/utils/lending/unifyMarkets";

const ITEMS_PER_PAGE = 10;

interface MarketContentProps {
  markets: Market[] | null | undefined;
}

const MarketContent: React.FC<MarketContentProps> = ({ markets }) => {
  const [currentPage, setCurrentPage] = useState(1);

  if (!markets || markets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">no markets found</div>
      </div>
    );
  }

  const unifiedMarkets = unifyMarkets(markets);

  const totalPages = Math.ceil(unifiedMarkets.length / ITEMS_PER_PAGE);
  const paginatedMarkets = unifiedMarkets.slice(
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
          onDetails={() => {}}
        />
      )}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      itemsPerPage={ITEMS_PER_PAGE}
      totalItems={unifiedMarkets.length}
    />
  );
};

export default MarketContent;
