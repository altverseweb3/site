"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/StyledDialog";
import {
  UnifiedMarketData,
  UserBorrowPosition,
  UserSupplyPosition,
} from "@/types/aave";
import { TokenTransferState } from "@/types/web3";
import TokenInputGroup from "@/components/ui/TokenInputGroup";
import { calculateApyWithIncentives } from "@/utils/lending/incentives";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { TrendingUp, Shield, Percent, ArrowDown } from "lucide-react";
import Image from "next/image";
import {
  useSourceToken,
  useDestinationToken,
  useSourceChain,
  useDestinationChain,
} from "@/store/web3Store";
import { TokenImage } from "@/components/ui/TokenImage";
import { TransactionDetails } from "@/components/ui/TransactionDetails";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { calculateTokenPrice } from "@/utils/common";

interface SupplyAssetModalProps {
  market: UnifiedMarketData;
  children: React.ReactNode;
  onSupply: (market: UnifiedMarketData) => void;
  onBorrow: (market: UnifiedMarketData) => void;
  onRepay?: (market: UserBorrowPosition) => void;
  onWithdraw?: (market: UserSupplyPosition) => void;
  tokenTransferState: TokenTransferState;
}

const SupplyAssetModal: React.FC<SupplyAssetModalProps> = ({
  market,
  children,
  tokenTransferState,
  onSupply,
}) => {
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const sourceChain = useSourceChain();
  const destinationChain = useDestinationChain();

  const isDirectSupply =
    sourceToken && destinationToken && sourceToken.id === destinationToken.id;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-m max-h-[80vh] overflow-hidden bg-[#18181B] border border-[#27272A] text-white flex flex-col">
        <DialogHeader className="border-b border-[#27272A] pb-4 flex-shrink-0 text-left">
          <h2 className="text-lg font-semibold">
            supply {market.underlyingToken.symbol}
          </h2>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <TokenInputGroup
            variant="source"
            amount={tokenTransferState.amount}
            onChange={tokenTransferState.handleAmountChange}
            showSelectToken={true}
            isEnabled={true}
            dollarValue={0}
            featuredTokens={[destinationToken!]}
            featuredTokensDescription="directly supply"
          />

          {/* Transaction Summary */}
          <div className="mt-4 bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-white">transaction preview</div>
            </div>

            <div className="space-y-3">
              {isDirectSupply ? (
                // Direct supply
                <div className="space-y-2">
                  <div className="text-sm text-[#A1A1AA]">you will supply</div>
                  <div className="flex items-start gap-3">
                    <TokenImage
                      token={sourceToken}
                      chain={sourceChain}
                      size="sm"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-mono text-white-400 font-semibold">
                          {tokenTransferState.amount || "0"}
                        </span>
                        <span className="text-white">{sourceToken.ticker}</span>
                      </div>
                      {(() => {
                        const usdAmount = calculateTokenPrice(
                          tokenTransferState.amount || "0",
                          market.usdExchangeRate.toString(),
                        );
                        return (
                          usdAmount > 0 && (
                            <span className="text-sm text-[#71717A] font-mono">
                              {formatCurrency(usdAmount)}
                            </span>
                          )
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                // Swap + supply
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="text-sm text-[#A1A1AA]">you will swap</div>
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        {sourceToken && (
                          <TokenImage
                            token={sourceToken}
                            chain={sourceChain}
                            size="sm"
                          />
                        )}
                        {sourceChain && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center">
                            <Image
                              src={sourceChain.brandedIcon}
                              alt={sourceChain.name}
                              width={10}
                              height={10}
                              className="rounded-full"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-mono text-white-400 font-semibold">
                            {tokenTransferState.amount || "0"}
                          </span>
                          <span className="text-white">
                            {sourceToken?.ticker || "???"}
                          </span>
                        </div>
                        {sourceToken &&
                          (() => {
                            const usdAmount = calculateTokenPrice(
                              tokenTransferState.amount || "0",
                              sourceToken.priceUsd || "0",
                            );
                            return (
                              usdAmount > 0 && (
                                <span className="text-sm text-[#71717A] font-mono">
                                  {formatCurrency(usdAmount)}
                                </span>
                              )
                            );
                          })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowDown className="w-4 h-4 text-[#A1A1AA]" />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-[#A1A1AA]">to receive</div>
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        {destinationToken && (
                          <TokenImage
                            token={destinationToken}
                            chain={destinationChain}
                            size="sm"
                          />
                        )}
                        {destinationChain && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center">
                            <Image
                              src={destinationChain.brandedIcon}
                              alt={destinationChain.name}
                              width={10}
                              height={10}
                              className="rounded-full"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg font-mono text-white-400 font-semibold ${tokenTransferState.isLoadingQuote ? "animate-pulse" : ""}`}
                          >
                            {tokenTransferState.receiveAmount || "0"}
                          </span>
                          <span className="text-white">
                            {destinationToken?.ticker || "???"}
                          </span>
                        </div>
                        {destinationToken &&
                          (() => {
                            const usdAmount = calculateTokenPrice(
                              tokenTransferState.receiveAmount || "0",
                              market.usdExchangeRate.toString() || "0",
                            );
                            return (
                              usdAmount > 0 && (
                                <span
                                  className={`text-sm text-[#71717A] font-mono ${tokenTransferState.isLoadingQuote ? "animate-pulse" : ""}`}
                                >
                                  {formatCurrency(usdAmount)}
                                </span>
                              )
                            );
                          })()}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-[#A1A1AA] pt-1">
                    then supply to lending pool
                  </div>
                </div>
              )}
            </div>
          </div>
          {!isDirectSupply && (
            <TransactionDetails
              estimatedTime={tokenTransferState.estimatedTimeSeconds}
            />
          )}
          {/* Asset Supply Details */}
          <div className="mt-4 bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              supply details
            </h3>

            <div className="space-y-3">
              {/* Supply APY */}
              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <Percent className="w-3 h-3 text-[#A1A1AA]" />
                  <span className="text-sm text-[#A1A1AA]">supply APY</span>
                </div>
                <div className="text-sm font-semibold text-green-400">
                  {formatPercentage(
                    calculateApyWithIncentives(
                      market.supplyData.apy,
                      0,
                      market.incentives,
                    ).finalSupplyAPY,
                  )}
                </div>
              </div>

              {/* Collateralization Status */}
              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-[#A1A1AA]" />
                  <span className="text-sm text-[#A1A1AA]">
                    can be collateral
                  </span>
                </div>
                <div
                  className={`text-sm font-semibold ${
                    market.supplyInfo.canBeCollateral
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {market.supplyInfo.canBeCollateral ? "yes" : "no"}
                </div>
              </div>
            </div>
          </div>
          <BrandedButton
            onClick={() => {
              onSupply(market);
              console.log(sourceToken);
              console.log(destinationToken);
              debugger;
            }}
            className="mt-3 flex-1 justify-center bg-green-500/20 hover:bg-green-500/30 hover:text-green-200 text-green-300 border-green-700/50 hover:border-green-600 transition-all duration-200 py-3 font-medium"
            buttonText={isDirectSupply ? "supply" : "swap"}
            iconName="Coins"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupplyAssetModal;
