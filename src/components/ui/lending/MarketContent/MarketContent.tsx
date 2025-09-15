"use client";

import React, { useState } from "react";
import MarketCard from "@/components/ui/lending/MarketContent/MarketCard";
import CardsList from "@/components/ui/CardsList";
import {
  UnifiedMarketData,
  UserBorrowData,
  UserBorrowPosition,
  UserSupplyData,
  UserSupplyPosition,
} from "@/types/aave";
import { TokenTransferState } from "@/types/web3";

const ITEMS_PER_PAGE = 10;

interface MarketContentProps {
  unifiedMarkets: UnifiedMarketData[] | null | undefined;
  marketBorrowData?: Record<string, UserBorrowData>;
  marketSupplyData?: Record<string, UserSupplyData>;
  tokenTransferState: TokenTransferState;
  onSupply: (market: UnifiedMarketData) => void;
  onBorrow: (market: UnifiedMarketData) => void;
}

const MarketContent: React.FC<MarketContentProps> = ({
  unifiedMarkets,
  tokenTransferState,
  onSupply,
  onBorrow,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  if (!unifiedMarkets || unifiedMarkets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">no markets found</div>
      </div>
    );
  }

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
          onSupply={onSupply}
          onBorrow={onBorrow}
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
      totalItems={unifiedMarkets.length}
    />
  );
};

export default MarketContent;
