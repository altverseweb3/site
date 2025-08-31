"use client";

import React, { useState, useMemo } from "react";
import AvailableSupplyCard from "./AvailableSupplyCard";
import CardsList from "@/components/ui/CardsList";
import { Market } from "@/types/aave";
import { unifyMarkets } from "@/utils/lending/unifyMarkets";

interface AvailableSupplyContentProps {
  markets: Market[] | null | undefined;
  showZeroBalance?: boolean;
}

const ITEMS_PER_PAGE = 10;

const AvailableSupplyContent: React.FC<AvailableSupplyContentProps> = ({
  markets,
  showZeroBalance = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and process markets for supply
  const availableSupplyMarkets = useMemo(() => {
    if (!markets || markets.length === 0) return [];

    const unifiedMarkets = unifyMarkets(markets);

    // Filter markets suitable for supply based on user balance
    return unifiedMarkets
      .filter((market) => {
        if (showZeroBalance) {
          return true; // Show all markets when showZeroBalance is enabled
        }

        // Find the original market data to access supplyReserves
        const originalMarket = markets.find(
          (m) => m.address === market.marketInfo.address,
        );
        if (!originalMarket?.supplyReserves) return false;

        // Check if user has any balance in any of the supply reserves for this market
        return originalMarket.supplyReserves.some((reserve) => {
          if (!reserve.userState) return false;
          if (reserve.underlyingToken.symbol === "USDC") {
            debugger;
          }
          const userBalance =
            parseFloat(reserve.userState.balance.amount.value) || 0;
          return userBalance > 0;
        });
      })
      .sort((a, b) => {
        // Sort by supply APY (highest first)
        const aSupplyAPY = a.supplyData.apy || 0;
        const bSupplyAPY = b.supplyData.apy || 0;
        return bSupplyAPY - aSupplyAPY;
      });
  }, [markets, showZeroBalance]);

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
          onSupply={() => {
            // TODO: Implement supply modal/flow
            console.log("Supply clicked for:", market.underlyingToken.symbol);
          }}
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
