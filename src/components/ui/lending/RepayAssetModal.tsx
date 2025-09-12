"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/StyledDialog";
import { UnifiedMarketData, UserBorrowPosition } from "@/types/aave";
import { TokenTransferState } from "@/types/web3";
import TokenInputGroup from "@/components/ui/TokenInputGroup";
import { calculateApyWithIncentives } from "@/utils/lending/incentives";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { TrendingUp, Percent, CreditCard } from "lucide-react";
import { useSourceToken, useSourceChain } from "@/store/web3Store";
import { ensureCorrectWalletTypeForChain } from "@/utils/swap/walletMethods";
import { TokenImage } from "@/components/ui/TokenImage";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { calculateTokenPrice } from "@/utils/common";
import WalletConnectButton from "@/components/ui/WalletConnectButton";
import SubscriptNumber from "@/components/ui/SubscriptNumber";

interface RepayAssetModalProps {
  market: UnifiedMarketData;
  position?: UserBorrowPosition;
  children: React.ReactNode;
  onRepay: (market: UnifiedMarketData, max: boolean) => void;
  tokenTransferState: TokenTransferState;
}

const RepayAssetModal: React.FC<RepayAssetModalProps> = ({
  market,
  position,
  children,
  tokenTransferState,
  onRepay,
}) => {
  const sourceToken = useSourceToken();
  const sourceChain = useSourceChain();

  const sourceWalletConnected = ensureCorrectWalletTypeForChain(sourceChain);

  const maxRepayableTokens =
    parseFloat(position?.borrow.debt.amount.value) || 0;
  const maxRepayableUsd = parseFloat(position?.borrow.debt.usd.value) || 0;
  const maxRepayableTokensString = position?.borrow.debt.amount.value || "0";

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-m max-h-[80vh] overflow-hidden bg-[#18181B] border border-[#27272A] text-white flex flex-col">
        <DialogHeader className="border-b border-[#27272A] pb-4 flex-shrink-0 text-left">
          <h2 className="text-lg font-semibold">
            repay {market.underlyingToken.symbol}
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
            featuredTokens={[sourceToken!]}
            featuredTokensDescription="directly repay"
            disableTokenSelect={true}
            disableWalletBalance={false}
          />

          {/* Max Repayable Amount */}
          <div className="mt-3 p-3 bg-sky-500/5 border border-sky-500/20 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="text-sm text-[#A1A1AA]">max repayable</div>
              <div className="flex flex-col items-end">
                <div className="text-sm font-mono font-semibold text-sky-300">
                  <SubscriptNumber value={maxRepayableTokensString} />{" "}
                  {market.underlyingToken.symbol}
                </div>
                <div className="text-xs font-mono text-[#71717A]">
                  {formatCurrency(maxRepayableUsd)}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  tokenTransferState.setAmount(maxRepayableTokensString);
                }}
                className="px-1 py-0.5 rounded-md bg-sky-500 bg-opacity-25 text-sky-500 text-xs cursor-pointer"
              >
                max
              </button>
              <span className="text-xs text-[#A1A1AA]">
                based on your debt balance
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
                  please select a token to repay
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-[#A1A1AA]">you will repay</div>
                <div className="flex items-start gap-3">
                  <TokenImage
                    token={sourceToken}
                    chain={sourceChain}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono text-white-400 font-semibold">
                        {<SubscriptNumber value={tokenTransferState.amount} />}
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

          {/* Asset Repay Details */}
          <div className="mt-4 bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-400" />
              repay details
            </h3>

            <div className="space-y-3">
              {/* Current Borrow APY */}
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

              {/* Health Factor Improvement */}
              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-sm text-[#A1A1AA]">
                    health factor calculation
                  </span>
                </div>
                <div className="text-sm font-mono font-semibold text-green-400">
                  %x -&gt; %y
                </div>
              </div>
            </div>
          </div>
          <BrandedButton
            onClick={async () => {
              // Check if user is doing a max repay by comparing with the max repayable amount
              const isMaxRepay =
                parseFloat(tokenTransferState.amount || "0") ===
                maxRepayableTokens;
              onRepay(market, isMaxRepay);
            }}
            disabled={
              !tokenTransferState.amount ||
              parseFloat(tokenTransferState.amount) <= 0 ||
              !sourceWalletConnected ||
              parseFloat(tokenTransferState.amount) > maxRepayableTokens
            }
            className="mt-3 flex-1 justify-center bg-sky-500/20 hover:bg-sky-500/30 hover:text-sky-200 text-sky-300 border-sky-700/50 hover:border-sky-600 transition-all duration-200 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            buttonText={
              parseFloat(tokenTransferState.amount || "0") >
                maxRepayableTokens &&
              parseFloat(tokenTransferState.amount || "0") > 0
                ? "exceeds debt balance"
                : "repay"
            }
            iconName="Coins"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RepayAssetModal;
