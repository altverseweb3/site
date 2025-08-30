"use client";

import React, { useState, useMemo } from "react";
import UserBorrowCard from "@/components/ui/lending/UserBorrowCard";
import CardsList from "@/components/ui/CardsList";
import { UserBorrowData, UserBorrowPosition } from "@/types/aave";

interface UserBorrowContentProps {
  marketBorrowData: Record<string, UserBorrowData>;
  showZeroBalance?: boolean;
}

const ITEMS_PER_PAGE = 10;

const UserBorrowContent: React.FC<UserBorrowContentProps> = ({
  marketBorrowData,
  showZeroBalance = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Transform marketBorrowData into individual borrow positions
  const userBorrowPositions = useMemo(() => {
    const positions: UserBorrowPosition[] = [];

    Object.values(marketBorrowData).forEach((marketData) => {
      if (marketData.borrows && marketData.borrows.length > 0) {
        marketData.borrows.forEach((borrow) => {
          const balanceUsd = parseFloat(borrow.debt.usd) || 0;

          // Filter based on showZeroBalance setting
          if (showZeroBalance || balanceUsd > 0) {
            positions.push({
              marketAddress: marketData.marketAddress,
              marketName: marketData.marketName,
              chainId: marketData.chainId,
              borrow,
            });
          }
        });
      }
    });

    // Sort by balance (highest first)
    return positions.sort((a, b) => {
      const balanceA = parseFloat(a.borrow.debt.usd) || 0;
      const balanceB = parseFloat(b.borrow.debt.usd) || 0;
      return balanceB - balanceA;
    });
  }, [marketBorrowData, showZeroBalance]);

  if (userBorrowPositions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA] text-sm">
          {showZeroBalance
            ? "no borrow positions found"
            : "no active borrow positions found"}
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
          onBorrow={() => {}}
          onRepay={() => {}}
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
