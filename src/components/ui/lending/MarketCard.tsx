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
import Image from "next/image";
import { formatCurrency, formatAPY, formatBalance } from "@/utils/formatters";
import { Reserve, Market } from "@/types/aave";

interface UnifiedMarketData extends Reserve {
  marketInfo: Market;
  supplyData: {
    apy: number;
    totalSupplied: string;
    totalSuppliedUsd: number;
  } | null;
  borrowData: {
    apy: number;
    totalBorrowed: string;
    totalBorrowedUsd: number;
  } | null;
  usdExchangeRate: number;
}

interface MarketCardProps {
  market: UnifiedMarketData;
  onDetails?: (market: UnifiedMarketData) => void;
}

const MarketCard: React.FC<MarketCardProps> = ({ market, onDetails }) => {
  // Extract data from unified structure
  const supplyAPY = market.supplyData?.apy || 0;
  const borrowAPY = market.borrowData?.apy || 0;
  const totalSupplied = market.supplyData?.totalSupplied || "0";
  const totalBorrowed = market.borrowData?.totalBorrowed || "0";
  const totalSuppliedUsd = market.supplyData?.totalSuppliedUsd || 0;
  const totalBorrowedUsd = market.borrowData?.totalBorrowedUsd || 0;

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
            {market.underlyingToken.symbol}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        {/* Total Supplied row */}
        {market.supplyData && (
          <>
            <div className="flex justify-between items-center">
              <div className="text-[#A1A1AA] text-sm">total supplied</div>
              <div className="text-right">
                <div className="text-[#FAFAFA] text-sm font-semibold font-mono">
                  {formatBalance(totalSupplied)} {market.underlyingToken.symbol}
                </div>
                <div className="text-[#A1A1AA] text-xs font-mono">
                  {formatCurrency(totalSuppliedUsd)}
                </div>
              </div>
            </div>

            {/* Supply APY row */}
            <div className="flex justify-between items-center">
              <div className="text-[#A1A1AA] text-sm">supply APY</div>
              <div className="text-green-500 text-sm font-semibold font-mono">
                {formatAPY(supplyAPY)}
              </div>
            </div>
          </>
        )}

        {/* Total Borrowed row */}
        {market.borrowData && (
          <>
            <div className="flex justify-between items-center">
              <div className="text-[#A1A1AA] text-sm">total borrowed</div>
              <div className="text-right">
                <div className="text-[#FAFAFA] text-sm font-semibold font-mono">
                  {formatBalance(totalBorrowed)} {market.underlyingToken.symbol}
                </div>
                <div className="text-[#A1A1AA] text-xs font-mono">
                  {formatCurrency(totalBorrowedUsd)}
                </div>
              </div>
            </div>

            {/* Borrow APY row */}
            <div className="flex justify-between items-center">
              <div className="text-[#A1A1AA] text-sm">borrow APY</div>
              <div className="text-red-500 text-sm font-semibold font-mono">
                {formatAPY(borrowAPY)}
              </div>
            </div>
          </>
        )}

        {/* Show message if neither supply nor borrow data available */}
        {!market.supplyData && !market.borrowData && (
          <div className="text-center py-4">
            <div className="text-[#A1A1AA] text-sm">
              No market data available
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
