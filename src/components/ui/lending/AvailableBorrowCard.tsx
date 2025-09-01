"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import BrandedButton from "@/components/ui/BrandedButton";
import TruncatedText from "@/components/ui/TruncatedText";
import Image from "next/image";
import {
  formatCurrency,
  formatBalance,
  formatPercentage,
} from "@/utils/formatters";
import { UnifiedMarketData } from "@/types/aave";
import { SquareMinus, SquareEqual, AlertTriangle } from "lucide-react";
import { calculateApyWithIncentives } from "@/utils/lending/incentives";
import * as Tooltip from "@radix-ui/react-tooltip";

interface AvailableBorrowCardProps {
  market: UnifiedMarketData;
  onSupply: (market: UnifiedMarketData) => void;
  onBorrow: (market: UnifiedMarketData) => void;
}

const AvailableBorrowCard: React.FC<AvailableBorrowCardProps> = ({
  market,
  onSupply,
  onBorrow,
}) => {
  // Extract borrow data
  const baseBorrowAPY = market.borrowData.apy;
  const totalSupplied = market.supplyData.totalSupplied;
  const totalBorrowed = market.borrowData.totalBorrowed;
  const totalSuppliedUsd = market.supplyData.totalSuppliedUsd;
  const totalBorrowedUsd = market.borrowData.totalBorrowedUsd;

  // Calculate available liquidity for borrowing
  const availableUsd = totalSuppliedUsd - totalBorrowedUsd;
  const availableTokens = (
    parseFloat(totalSupplied) - parseFloat(totalBorrowed)
  ).toString();

  // Calculate final borrow APY with incentives
  const { finalBorrowAPY, hasBorrowBonuses, hasMixedIncentives } =
    calculateApyWithIncentives(0, baseBorrowAPY, market.incentives);

  // Check if market is available for borrowing
  const isAvailable =
    !market.isFrozen &&
    !market.isPaused &&
    market.borrowInfo?.borrowingState === "ENABLED";
  const hasLiquidity = availableUsd > 0;

  return (
    <Card className="text-white border border-[#27272A] bg-[#18181B] rounded-lg shadow-none hover:bg-[#1C1C1F] transition-colors">
      <CardHeader className="flex flex-row items-start p-4 pb-2 space-y-0">
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center mr-3 flex-shrink-0">
          <Image
            src={market.underlyingToken.imageUrl}
            alt={market.underlyingToken.symbol}
            width={32}
            height={32}
            className="object-contain"
            onError={(e) => {
              e.currentTarget.src = "/images/tokens/default.svg";
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-[#FAFAFA] leading-none">
              {market.underlyingToken.name}
            </CardTitle>
            {(!isAvailable || !hasLiquidity) && (
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="bg-[#18181B] border border-[#27272A] text-white text-xs px-2 py-1 rounded shadow-lg"
                      sideOffset={5}
                    >
                      {!hasLiquidity
                        ? "No Liquidity"
                        : market.isFrozen && market.isPaused
                          ? "Frozen, Paused"
                          : market.isFrozen
                            ? "Frozen"
                            : market.isPaused
                              ? "Paused"
                              : !market.borrowInfo?.borrowingState ||
                                  market.borrowInfo?.borrowingState ===
                                    "DISABLED"
                                ? "Borrow Disabled"
                                : "Not Available"}
                      <Tooltip.Arrow className="fill-[#27272A]" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            )}
          </div>
          <CardDescription className="text-[#A1A1AA] text-xs mt-1 flex items-center gap-1">
            <Image
              src={market.marketInfo.icon}
              alt={market.marketName}
              width={16}
              height={16}
              className="object-contain rounded-full"
              onError={(e) => {
                e.currentTarget.src = "/images/markets/default.svg";
              }}
            />
            {market.marketName}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        {/* Borrow APY */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">borrow APY</div>
          <div className="flex items-center gap-1">
            {hasBorrowBonuses && (
              <SquareMinus className="w-5 h-5 text-amber-500" />
            )}
            {hasMixedIncentives && (
              <SquareEqual className="w-5 h-5 text-indigo-500" />
            )}
            <span className="text-red-500 text-sm font-semibold font-mono">
              {formatPercentage(finalBorrowAPY)}
            </span>
          </div>
        </div>

        {/* Available Liquidity */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">available</div>
          <div className="text-right">
            <div
              className={`text-sm font-semibold font-mono ${hasLiquidity ? "text-[#FAFAFA]" : "text-red-400"}`}
            >
              {formatBalance(availableTokens)}{" "}
              <TruncatedText
                text={market.underlyingToken.symbol}
                maxLength={6}
                className={`text-sm font-semibold font-mono ${hasLiquidity ? "text-[#FAFAFA]" : "text-red-400"}`}
              />
            </div>
            <div
              className={`text-xs font-mono ${hasLiquidity ? "text-[#A1A1AA]" : "text-red-400"}`}
            >
              {formatCurrency(Math.max(0, availableUsd))}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center p-4 pt-0">
        <BrandedButton
          buttonText="details"
          onClick={() => {
            onBorrow?.(market);
            onSupply?.(market);
          }}
          className="w-full text-xs py-2 h-8"
          disabled={!isAvailable || !hasLiquidity}
        />
      </CardFooter>
    </Card>
  );
};

export default AvailableBorrowCard;
