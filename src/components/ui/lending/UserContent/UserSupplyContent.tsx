"use client";

import React, { useMemo } from "react";
import UserSupplyCard from "@/components/ui/lending/UserContent/UserSupplyCard";
import CardsList from "@/components/ui/CardsList";
import { UnifiedReserveData } from "@/types/aave";
import { TokenTransferState } from "@/types/web3";
import { LendingFilters, LendingSortConfig } from "@/types/lending";

interface UserSupplyContentProps {
  markets: UnifiedReserveData[];
  userAddress: string | undefined;
  tokenTransferState: TokenTransferState;
  filters?: LendingFilters;
  sortConfig?: LendingSortConfig | null;
  refetchMarkets: () => void;
}

const UserSupplyContent: React.FC<UserSupplyContentProps> = ({
  markets,
  userAddress,
  tokenTransferState,
  filters,
  sortConfig,
  refetchMarkets,
}) => {
  // Apply filtering and sorting with useMemo for performance
  const userSupplyReserves = useMemo(() => {
    // Apply asset filter
    let filteredReserves = markets.filter(
      (market) => market.userSupplyPositions.length > 0,
    );
    if (filters?.assetFilter) {
      const filterLower = filters.assetFilter.toLowerCase();
      filteredReserves = markets.filter((market) => {
        return (
          // Filter by title (underlyingToken.name)
          market.underlyingToken.name.toLowerCase().includes(filterLower) ||
          // Filter by ticker (currency.symbol)
          market.underlyingToken.symbol.toLowerCase().includes(filterLower) ||
          // Also include market name for broader matching
          market.marketName.toLowerCase().includes(filterLower)
        );
      });
    }

    // Apply sorting
    if (sortConfig) {
      return [...filteredReserves].sort((a, b) => {
        let aValue: number;
        let bValue: number;

        switch (sortConfig.column) {
          case "supplyApy":
            aValue = parseFloat(a.supplyInfo.apy.value) || 0;
            bValue = parseFloat(b.supplyInfo.apy.value) || 0;
            break;
          case "userSuppliedValue":
            aValue = parseFloat(a.userSupplyPositions[0]?.balance.usd) || 0;
            bValue = parseFloat(b.userSupplyPositions[0]?.balance.usd) || 0;
            break;
          default:
            // Default sort by supplied value (highest first)
            aValue = parseFloat(a.userSupplyPositions[0]?.balance.usd) || 0;
            bValue = parseFloat(b.userSupplyPositions[0]?.balance.usd) || 0;
            break;
        }

        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      });
    } else {
      // Default sort by balance (highest first)
      return filteredReserves.sort((a, b) => {
        const balanceA = parseFloat(a.userSupplyPositions[0]?.balance.usd) || 0;
        const balanceB = parseFloat(b.userSupplyPositions[0]?.balance.usd) || 0;
        return balanceB - balanceA;
      });
    }
  }, [markets, filters, sortConfig]);

  if (userSupplyReserves.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA] text-sm">
          your supply positions will be displayed here
        </div>
      </div>
    );
  }

  return (
    <CardsList
      data={userSupplyReserves}
      renderCard={(reserve) => (
        <UserSupplyCard
          key={`${reserve.market.address}-${reserve.underlyingToken.address}`}
          unifiedReserve={reserve}
          userAddress={userAddress}
          tokenTransferState={tokenTransferState}
          refetchMarkets={refetchMarkets}
        />
      )}
    />
  );
};

export default UserSupplyContent;
