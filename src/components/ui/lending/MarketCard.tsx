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
  formatPercentage,
  formatBalance,
} from "@/utils/formatters";
import {
  UnifiedMarketData,
  UserBorrowPosition,
  UserSupplyPosition,
} from "@/types/aave";
import { SquarePlus, SquareMinus, SquareEqual } from "lucide-react";
import { calculateApyWithIncentives } from "@/utils/lending/incentives";
import AssetDetailsModal from "@/components/ui/lending/AssetDetailsModal";

interface MarketCardProps {
  market: UnifiedMarketData;
  onSupply: (market: UnifiedMarketData) => void;
  onBorrow: (market: UnifiedMarketData) => void;
  onRepay?: (market: UserBorrowPosition) => void;
  onWithdraw?: (market: UserSupplyPosition) => void;
  onDetails?: (market: UnifiedMarketData) => void;
}

const MarketCard: React.FC<MarketCardProps> = ({
  market,
  onSupply,
  onBorrow,
}) => {
  // Extract data from unified structure
  const baseSupplyAPY = market.supplyData.apy;
  const baseBorrowAPY = market.borrowData.apy;
  const totalSupplied = market.supplyData.totalSupplied;
  const totalBorrowed = market.borrowData.totalBorrowed;
  const totalSuppliedUsd = market.supplyData.totalSuppliedUsd;
  const totalBorrowedUsd = market.borrowData.totalBorrowedUsd;

  // Calculate final APYs with incentives
  const {
    finalSupplyAPY,
    finalBorrowAPY,
    hasSupplyBonuses,
    hasBorrowBonuses,
    hasMixedIncentives,
  } = calculateApyWithIncentives(
    baseSupplyAPY,
    baseBorrowAPY,
    market.incentives,
  );

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
          <CardTitle className="text-sm font-semibold text-[#FAFAFA] leading-none">
            {market.underlyingToken.name}
          </CardTitle>
          <CardDescription className="text-[#A1A1AA] text-xs mt-1 flex items-center gap-1">
            <Image
              src={market.market.icon}
              alt={market.market.chain.name}
              width={16}
              height={16}
              className="object-contain rounded-full"
              onError={(e) => {
                e.currentTarget.src = "/images/markets/default.svg";
              }}
            />
            {market.marketName}
            {(market.isFrozen || market.isPaused) && (
              <span className="ml-1 text-red-400">
                {market.isFrozen && market.isPaused
                  ? "(Frozen, Paused)"
                  : market.isFrozen
                    ? "(Frozen)"
                    : "(Paused)"}
              </span>
            )}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        {/* Total Supplied row - always show */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">total supplied</div>
          <div className="text-right">
            <div className="text-[#FAFAFA] text-sm font-semibold font-mono">
              {formatBalance(totalSupplied)}{" "}
              <TruncatedText
                text={market.underlyingToken.symbol}
                maxLength={6}
                className="text-[#FAFAFA] text-sm font-semibold font-mono"
              />
            </div>
            <div className="text-[#A1A1AA] text-xs font-mono">
              {formatCurrency(totalSuppliedUsd)}
            </div>
          </div>
        </div>

        {/* Supply APY row - always show */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">supply APY</div>
          <div className="flex items-center gap-1">
            {hasSupplyBonuses && (
              <SquarePlus className="w-5 h-5 text-green-500" />
            )}
            {hasMixedIncentives && (
              <SquareEqual className="w-5 h-5 text-indigo-500" />
            )}
            <span className="text-green-500 text-sm font-semibold font-mono">
              {formatPercentage(finalSupplyAPY)}
            </span>
          </div>
        </div>

        {/* Total Borrowed row - always show */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">total borrowed</div>
          <div className="text-right">
            <div className="text-[#FAFAFA] text-sm font-semibold font-mono">
              {formatBalance(totalBorrowed)}{" "}
              <TruncatedText
                text={market.underlyingToken.symbol}
                maxLength={6}
                className="text-[#FAFAFA] text-sm font-semibold font-mono"
              />
            </div>
            <div className="text-[#A1A1AA] text-xs font-mono">
              {formatCurrency(totalBorrowedUsd)}
            </div>
          </div>
        </div>

        {/* Borrow APY row - always show */}
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
      </CardContent>

      <CardFooter className="flex justify-center p-4 pt-0">
        <AssetDetailsModal
          market={market}
          onSupply={onSupply}
          onBorrow={onBorrow}
        >
          <BrandedButton
            buttonText="details"
            className="w-full text-xs py-2 h-8"
          />
        </AssetDetailsModal>
      </CardFooter>
    </Card>
  );
};

export default MarketCard;
