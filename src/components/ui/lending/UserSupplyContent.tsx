"use client";

import React, { useState } from "react";
import UserSupplyCard from "@/components/ui/lending/UserSupplyCard";
import CardsList from "@/components/ui/CardsList";
import { UserSupplyData, UserSupplyPosition } from "@/types/aave";

interface UserSupplyContentProps {
  marketSupplyData: Record<string, UserSupplyData>;
}

const ITEMS_PER_PAGE = 10;

const UserSupplyContent: React.FC<UserSupplyContentProps> = ({
  marketSupplyData,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const positions: UserSupplyPosition[] = [];
  Object.values(marketSupplyData).forEach((marketData) => {
    if (marketData.supplies && marketData.supplies.length > 0) {
      marketData.supplies.forEach((supply) => {
        positions.push({
          marketAddress: marketData.marketAddress,
          marketName: marketData.marketName,
          chainId: marketData.chainId,
          supply,
        });
      });
    }
  });

  // Sort by balance (highest first)
  const userSupplyPositions = positions.sort((a, b) => {
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
          onSupply={() => {}}
          onWithdraw={() => {}}
          onToggleCollateral={() => {}}
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
