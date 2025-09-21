"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/StyledDialog";
import { UnifiedReserveData } from "@/types/aave";
import { TokenTransferState } from "@/types/web3";
import TokenInputGroup from "@/components/ui/TokenInputGroup";
import { calculateApyWithIncentives } from "@/utils/lending/incentives";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { TrendingDown, Percent } from "lucide-react";
import { useSourceToken, useSourceChain } from "@/store/web3Store";
import { ensureCorrectWalletTypeForChain } from "@/utils/swap/walletMethods";
import { TokenImage } from "@/components/ui/TokenImage";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { calculateTokenPrice } from "@/utils/common";
import WalletConnectButton from "@/components/ui/WalletConnectButton";
import HealthFactorRiskDisplay from "@/components/ui/lending/AssetDetails/HealthFactorRiskDisplay";
import { useBorrowOperations } from "@/hooks/lending/useBorrowOperations";

interface BorrowAssetModalProps {
  market: UnifiedReserveData;
  userAddress: string | undefined;
  children: React.ReactNode;
  tokenTransferState: TokenTransferState;
  healthFactor?: string | null;
  refetchMarkets: () => void;
}

const BorrowAssetModal: React.FC<BorrowAssetModalProps> = ({
  market,
  userAddress,
  children,
  tokenTransferState,
  refetchMarkets,
}) => {
  const sourceToken = useSourceToken();
  const sourceChain = useSourceChain();

  const sourceWalletConnected = ensureCorrectWalletTypeForChain(sourceChain);

  const { handleBorrow } = useBorrowOperations({
    sourceChain,
    sourceToken,
    userWalletAddress: userAddress || null,
    tokenBorrowState: { amount: tokenTransferState.amount || "" },
    refetchMarkets,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-m max-h-[80vh] overflow-hidden bg-[#18181B] border border-[#27272A] text-white flex flex-col">
        <DialogHeader className="border-b border-[#27272A] pb-4 flex-shrink-0 text-left">
          <DialogTitle className="text-lg font-semibold">
            borrow {market.underlyingToken.symbol}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <TokenInputGroup
            variant="source"
            amount={tokenTransferState.amount}
            onChange={tokenTransferState.handleAmountChange}
            showSelectToken={true}
            isEnabled={true}
            dollarValue={0}
            featuredTokens={[sourceToken!]}
            featuredTokensDescription="directly borrow"
            disableTokenSelect={true}
            disableWalletBalance={true}
          />

          {/* Max Borrowable Amount */}
          <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="text-sm text-[#A1A1AA]">max borrowable</div>
              <div className="flex flex-col items-end">
                <div className="text-sm font-mono font-semibold text-amber-300">
                  {market.userState?.borrowable?.amount?.value || "0"}{" "}
                  {market.underlyingToken.symbol}
                </div>
                <div className="text-xs font-mono text-[#71717A]">
                  {formatCurrency(
                    parseFloat(market.userState?.borrowable?.usd || "0"),
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  const maxAmount =
                    market.userState?.borrowable?.amount?.value || "0";
                  tokenTransferState.setAmount(maxAmount);
                }}
                className="text-xs px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/50 rounded transition-all duration-200"
              >
                max
              </button>
              <span className="text-xs text-[#A1A1AA]">
                based on your collateral and health factor
              </span>
            </div>
          </div>

          {!sourceWalletConnected && (
            <div className="mt-4 flex justify-end">
              <WalletConnectButton
                walletType={sourceChain.walletType}
                className="w-auto"
              />
            </div>
          )}

          {/* Transaction Summary */}
          <div className="mt-4 bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-white">transaction preview</div>
            </div>

            {!sourceToken ? (
              <div className="text-center py-4">
                <div className="text-sm text-[#A1A1AA]">
                  please select a token to borrow
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-[#A1A1AA]">you will borrow</div>
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
            )}
          </div>

          {/* Asset Borrow Details */}
          <div className="mt-4 bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              borrow details
            </h3>

            <div className="space-y-3">
              {/* Borrow APY */}
              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <Percent className="w-3 h-3 text-[#A1A1AA]" />
                  <span className="text-sm text-[#A1A1AA]">variable APY</span>
                </div>
                <div className="text-sm font-mono font-semibold text-red-400">
                  {formatPercentage(
                    calculateApyWithIncentives(
                      0,
                      market.borrowData.apy,
                      market.incentives,
                    ).finalBorrowAPY,
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Health Factor Risk Display */}
          <HealthFactorRiskDisplay
            amount={tokenTransferState.amount}
            sourceToken={sourceToken || undefined}
            userAddress={userAddress}
            market={market}
            operation="borrow"
            className="mt-4"
          />

          <BrandedButton
            onClick={async () => {
              console.log(
                "BorrowAssetModal: Button clicked - executing borrow",
              );
              handleBorrow(market);
            }}
            disabled={
              !tokenTransferState.amount ||
              parseFloat(tokenTransferState.amount) <= 0 ||
              !sourceWalletConnected ||
              parseFloat(tokenTransferState.amount) >
                parseFloat(market.userState?.borrowable?.amount?.value || "0")
            }
            className="mt-3 flex-1 justify-center bg-red-500/20 hover:bg-red-500/30 hover:text-red-200 text-red-300 border-red-700/50 hover:border-red-600 transition-all duration-200 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            buttonText={
              parseFloat(tokenTransferState.amount || "0") >
                parseFloat(
                  market.userState?.borrowable?.amount?.value || "0",
                ) && parseFloat(tokenTransferState.amount || "0") > 0
                ? "exceeds max borrowable"
                : "borrow"
            }
            iconName="TrendingDown"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BorrowAssetModal;
