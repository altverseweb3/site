"use client";
import React, { useState } from "react";
import UserBorrowCard from "@/components/ui/lending/UserBorrowCard";
import CardsList from "@/components/ui/CardsList";
import {
  UserBorrowData,
  UserBorrowPosition,
  Market,
  UnifiedMarketData,
} from "@/types/aave";
import { unifyMarkets } from "@/utils/lending/unifyMarkets";
import { TokenTransferState } from "@/types/web3";

interface UserBorrowContentProps {
  marketBorrowData: Record<string, UserBorrowData>;
  activeMarkets: Market[];
  showZeroBalance?: boolean;
  tokenTransferState: TokenTransferState;
}

interface EnhancedUserBorrowPosition extends UserBorrowPosition {
  unifiedMarket: UnifiedMarketData;
}

const ITEMS_PER_PAGE = 10;

const UserBorrowContent: React.FC<UserBorrowContentProps> = ({
  marketBorrowData,
  activeMarkets,
  showZeroBalance = false,
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

  const enhancedPositions: EnhancedUserBorrowPosition[] = [];

  Object.values(marketBorrowData).forEach((marketData) => {
    if (marketData.borrows && marketData.borrows.length > 0) {
      marketData.borrows.forEach((borrow) => {
        const marketKey = `${marketData.marketAddress}-${marketData.chainId}`;
        const unifiedMarket = unifiedMarketMap.get(marketKey);

        if (unifiedMarket) {
          const debtAmount = parseFloat(borrow.debt.usd) || 0;
          if (!showZeroBalance && debtAmount === 0) {
            return;
          }

          enhancedPositions.push({
            marketAddress: marketData.marketAddress,
            marketName: marketData.marketName,
            chainId: marketData.chainId,
            borrow,
            unifiedMarket,
          });
        }
      });
    }
  });

  // Sort by debt amount (highest first)
  const userBorrowPositions = enhancedPositions.sort((a, b) => {
    const balanceA = parseFloat(a.borrow.debt.usd) || 0;
    const balanceB = parseFloat(b.borrow.debt.usd) || 0;
    return balanceB - balanceA;
  });

  if (userBorrowPositions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA] text-sm">
          your borrow positions will be displayed here
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(userBorrowPositions.length / ITEMS_PER_PAGE);
  const paginatedPositions = userBorrowPositions.slice(
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
        <UserBorrowCard
          key={`${position.marketAddress}-${position.borrow.currency.symbol}`}
          position={position}
          unifiedMarket={position.unifiedMarket}
          onSupply={(market: UnifiedMarketData) => {
            console.log(market); // TODO: update me
          }}
          onBorrow={(market: UnifiedMarketData) => {
            console.log(market); // TODO: update me
          }}
          onRepay={(position: UserBorrowPosition) => {
            console.log(position); // TODO: update me
          }}
          tokenTransferState={tokenTransferState}
        />
      )}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      itemsPerPage={ITEMS_PER_PAGE}
      totalItems={userBorrowPositions.length}
    />
  );
};

export default UserBorrowContent;
