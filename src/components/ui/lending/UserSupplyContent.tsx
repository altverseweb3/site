"use client";

import React, { useState } from "react";
import UserSupplyCard from "@/components/ui/lending/UserSupplyCard";
import CardsList from "@/components/ui/CardsList";
import {
  UserSupplyData,
  UserSupplyPosition,
  Market,
  UnifiedMarketData,
} from "@/types/aave";
import { unifyMarkets } from "@/utils/lending/unifyMarkets";
import { TokenTransferState } from "@/types/web3";

interface UserSupplyContentProps {
  marketSupplyData: Record<string, UserSupplyData>;
  activeMarkets: Market[];
  tokenTransferState: TokenTransferState;
}

interface EnhancedUserSupplyPosition extends UserSupplyPosition {
  unifiedMarket: UnifiedMarketData;
}

const ITEMS_PER_PAGE = 10;

const UserSupplyContent: React.FC<UserSupplyContentProps> = ({
  marketSupplyData,
  activeMarkets,
  tokenTransferState,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const unifiedMarkets = unifyMarkets(activeMarkets);

  // lookup map for unified markets by market address and chain
  const unifiedMarketMap = new Map<string, UnifiedMarketData>();
  unifiedMarkets.forEach((market) => {
    const key = `${market.marketInfo.address}-${market.marketInfo.chain.chainId}`;
    unifiedMarketMap.set(key, market);
  });

  const enhancedPositions: EnhancedUserSupplyPosition[] = [];

  Object.values(marketSupplyData).forEach((marketData) => {
    if (marketData.supplies && marketData.supplies.length > 0) {
      marketData.supplies.forEach((supply) => {
        const marketKey = `${marketData.marketAddress}-${marketData.chainId}`;
        const unifiedMarket = unifiedMarketMap.get(marketKey);

        if (unifiedMarket) {
          enhancedPositions.push({
            marketAddress: marketData.marketAddress,
            marketName: marketData.marketName,
            chainId: marketData.chainId,
            supply,
            unifiedMarket,
          });
        }
      });
    }
  });

  // Sort by balance (highest first)
  const userSupplyPositions = enhancedPositions.sort((a, b) => {
    const balanceA = parseFloat(a.supply.balance.usd) || 0;
    const balanceB = parseFloat(b.supply.balance.usd) || 0;
    return balanceB - balanceA;
  });

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
          onSupply={(market: UnifiedMarketData) => {
            console.log(market); // TODO: update me
          }}
          onBorrow={(market: UnifiedMarketData) => {
            console.log(market); // TODO: update me
          }}
          onWithdraw={(position: UserSupplyPosition) => {
            console.log(position); // TODO: update me
          }}
          onToggleCollateral={(position: UserSupplyPosition) => {
            console.log(position); // TODO: update me
          }}
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
