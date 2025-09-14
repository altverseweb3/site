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
import { UnifiedMarketData } from "@/types/aave";
import { SquarePlus, SquareEqual, AlertTriangle } from "lucide-react";
import { calculateApyWithIncentives } from "@/utils/lending/incentives";
import AssetDetailsModal from "@/components/ui/lending/AssetDetails/AssetDetailsModal";
import { TokenTransferState } from "@/types/web3";
import {
  HealthFactorPreviewArgs,
  HealthFactorPreviewResult,
} from "@/hooks/lending/useHealthFactorPreviewOperations";

interface AvailableSupplyCardProps {
  market: UnifiedMarketData;
  userAddress: string | undefined;
  onSupply: (market: UnifiedMarketData) => void;
  onBorrow: (market: UnifiedMarketData) => void;
  tokenTransferState: TokenTransferState;
  onHealthFactorPreview: (
    args: HealthFactorPreviewArgs,
  ) => Promise<HealthFactorPreviewResult>;
}

const AvailableSupplyCard: React.FC<AvailableSupplyCardProps> = ({
  market,
  userAddress,
  onSupply,
  onBorrow,
  tokenTransferState,
  onHealthFactorPreview,
}) => {
  // Extract supply data
  const baseSupplyAPY = market.supplyData.apy;
  const totalSupplied = market.supplyData.totalSupplied;
  const totalSuppliedUsd = market.supplyData.totalSuppliedUsd;

  // Calculate final supply APY with incentives
  const { finalSupplyAPY, hasSupplyBonuses, hasMixedIncentives } =
    calculateApyWithIncentives(baseSupplyAPY, 0, market.incentives);

  // Check if market is available for supply
  const isAvailable = !market.isFrozen && !market.isPaused;

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
            {!isAvailable && <AlertTriangle className="w-4 h-4 text-red-400" />}
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
            {!isAvailable && (
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
        {/* Supply APY */}
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

        {/* Market Liquidity */}
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

        {/* Can be used as collateral indicator */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">collateral</div>
          <div className="flex items-center gap-1">
            <span
              className={`text-xs font-medium ${
                market.supplyInfo.canBeCollateral
                  ? "text-green-500"
                  : "text-[#A1A1AA]"
              }`}
            >
              {market.supplyInfo.canBeCollateral ? "enabled" : "disabled"}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center p-4 pt-0">
        <AssetDetailsModal
          market={market}
          userAddress={userAddress}
          onSupply={onSupply}
          onBorrow={onBorrow}
          onHealthFactorPreview={onHealthFactorPreview}
          tokenTransferState={tokenTransferState}
          buttonsToShow={["supply", "borrow"]}
        >
          <BrandedButton
            buttonText="details"
            className="w-full text-xs py-2 h-8"
            disabled={!isAvailable}
          />
        </AssetDetailsModal>
      </CardFooter>
    </Card>
  );
};

export default AvailableSupplyCard;
