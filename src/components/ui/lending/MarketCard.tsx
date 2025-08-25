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
import { formatCurrency, formatAPY, formatBalance } from "@/utils/formatters";
import { Reserve, Market } from "@/types/aave";

interface UnifiedMarketData extends Reserve {
  marketInfo: Market;
  marketName: string;
  supplyData: {
    apy: number;
    totalSupplied: string;
    totalSuppliedUsd: number;
  };
  borrowData: {
    apy: number;
    totalBorrowed: string;
    totalBorrowedUsd: number;
  };
  usdExchangeRate: number;
  isFrozen: boolean;
  isPaused: boolean;
}

interface MarketCardProps {
  market: UnifiedMarketData;
  onDetails?: (market: UnifiedMarketData) => void;
}

const MarketCard: React.FC<MarketCardProps> = ({ market, onDetails }) => {
  // Extract data from unified structure
  const supplyAPY = market.supplyData.apy;
  const borrowAPY = market.borrowData.apy;
  const totalSupplied = market.supplyData.totalSupplied;
  const totalBorrowed = market.borrowData.totalBorrowed;
  const totalSuppliedUsd = market.supplyData.totalSuppliedUsd;
  const totalBorrowedUsd = market.borrowData.totalBorrowedUsd;

  // Process incentives with deduplication
  const getIncentiveDisplay = (incentives: Reserve["incentives"]) => {
    if (!incentives || incentives.length === 0) return null;

    const seen = new Set<string>();
    const uniqueIncentives: {
      key: string;
      text: string;
      aprValue: number;
      type: string;
      rawValue: string;
      decimals: number;
      formattedValue: string;
      claimLink?: unknown;
      rewardTokenAddress?: string;
      rewardTokenSymbol?: string;
      supplyToken?: {
        address: string;
        imageUrl: string;
        name: string;
        symbol: string;
        decimals: number;
        chainId: number;
      };
      borrowToken?: {
        address: string;
        imageUrl: string;
        name: string;
        symbol: string;
        decimals: number;
        chainId: number;
      };
    }[] = [];

    incentives.forEach((incentive, index) => {
      let text = "";
      let aprValue = 0;
      let dedupeKey = "";
      let rawValue = "";
      let decimals = 0;
      let formattedValue = "";
      let claimLink: unknown;
      let rewardTokenAddress: string | undefined;
      let rewardTokenSymbol: string | undefined;
      let supplyToken:
        | {
            address: string;
            imageUrl: string;
            name: string;
            symbol: string;
            decimals: number;
            chainId: number;
          }
        | undefined;
      let borrowToken:
        | {
            address: string;
            imageUrl: string;
            name: string;
            symbol: string;
            decimals: number;
            chainId: number;
          }
        | undefined;

      switch (incentive.__typename) {
        case "MeritSupplyIncentive":
          text = "merit supply";
          aprValue = incentive.extraSupplyApr.value;
          rawValue = incentive.extraSupplyApr.raw;
          decimals = incentive.extraSupplyApr.decimals;
          formattedValue = incentive.extraSupplyApr.formatted.toString();
          claimLink = incentive.claimLink;
          dedupeKey = "merit-supply";
          break;
        case "MeritBorrowIncentive":
          text = "merit borrow";
          aprValue = incentive.borrowAprDiscount.value;
          rawValue = incentive.borrowAprDiscount.raw;
          decimals = incentive.borrowAprDiscount.decimals;
          formattedValue = incentive.borrowAprDiscount.formatted.toString();
          claimLink = incentive.claimLink;
          dedupeKey = "merit-borrow";
          break;
        case "MeritBorrowAndSupplyIncentiveCondition":
          text = `merit ${incentive.supplyToken.symbol}/${incentive.borrowToken.symbol}`;
          aprValue = incentive.extraApr.value;
          rawValue = incentive.extraApr.raw;
          decimals = incentive.extraApr.decimals;
          formattedValue = incentive.extraApr.formatted.toString();
          claimLink = incentive.claimLink;
          supplyToken = {
            address: incentive.supplyToken.address,
            imageUrl: incentive.supplyToken.imageUrl,
            name: incentive.supplyToken.name,
            symbol: incentive.supplyToken.symbol,
            decimals: incentive.supplyToken.decimals,
            chainId: incentive.supplyToken.chainId,
          };
          borrowToken = {
            address: incentive.borrowToken.address,
            imageUrl: incentive.borrowToken.imageUrl,
            name: incentive.borrowToken.name,
            symbol: incentive.borrowToken.symbol,
            decimals: incentive.borrowToken.decimals,
            chainId: incentive.borrowToken.chainId,
          };
          dedupeKey = `merit-condition-${incentive.supplyToken.symbol}-${incentive.borrowToken.symbol}`;
          break;
        case "AaveSupplyIncentive":
          text = `${incentive.rewardTokenSymbol} supply`;
          aprValue = incentive.extraSupplyApr.value;
          rawValue = incentive.extraSupplyApr.raw;
          decimals = incentive.extraSupplyApr.decimals;
          formattedValue = incentive.extraSupplyApr.formatted.toString();
          rewardTokenAddress = incentive.rewardTokenAddress;
          rewardTokenSymbol = incentive.rewardTokenSymbol;
          dedupeKey = `aave-supply-${incentive.rewardTokenSymbol}`;
          break;
        case "AaveBorrowIncentive":
          text = `${incentive.rewardTokenSymbol} borrow`;
          aprValue = incentive.borrowAprDiscount.value;
          rawValue = incentive.borrowAprDiscount.raw;
          decimals = incentive.borrowAprDiscount.decimals;
          formattedValue = incentive.borrowAprDiscount.formatted.toString();
          rewardTokenAddress = incentive.rewardTokenAddress;
          rewardTokenSymbol = incentive.rewardTokenSymbol;
          dedupeKey = `aave-borrow-${incentive.rewardTokenSymbol}`;
          break;
      }

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        uniqueIncentives.push({
          key: `${incentive.__typename}-${index}`,
          text,
          aprValue,
          type: incentive.__typename.includes("Supply") ? "supply" : "borrow",
          rawValue,
          decimals,
          formattedValue,
          claimLink,
          rewardTokenAddress,
          rewardTokenSymbol,
          supplyToken,
          borrowToken,
        });
      }
    });

    return uniqueIncentives;
  };

  const incentiveDisplays = getIncentiveDisplay(market.incentives);

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
          <CardDescription className="text-[#A1A1AA] text-xs mt-1">
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
          <div className="text-green-500 text-sm font-semibold font-mono">
            {formatAPY(supplyAPY)}
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
          <div className="text-red-500 text-sm font-semibold font-mono">
            {formatAPY(borrowAPY)}
          </div>
        </div>

        {/* Incentives section */}
        {incentiveDisplays && incentiveDisplays.length > 0 && (
          <div className="border-t border-[#27272A] pt-3 mt-3">
            <div className="text-[#A1A1AA] text-xs mb-2">incentives</div>
            <div className="space-y-1">
              {incentiveDisplays.map((incentive) => (
                <div
                  key={incentive.key}
                  className="flex justify-between items-center"
                >
                  <div className="text-[#A1A1AA] text-xs">{incentive.text}</div>
                  <div
                    className={`text-xs font-semibold font-mono ${
                      incentive.type === "supply"
                        ? "text-green-400"
                        : "text-orange-400"
                    }`}
                  >
                    {incentive.type === "supply" ? "+" : "-"}
                    {formatAPY(incentive.aprValue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-center p-4 pt-0">
        <BrandedButton
          buttonText="details"
          onClick={() => onDetails?.(market)}
          className="w-full text-xs py-2 h-8"
          disabled={true}
        />
      </CardFooter>
    </Card>
  );
};

export default MarketCard;
