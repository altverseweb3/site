"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/StyledDialog";
import { UnifiedReserveData, UserSupplyPosition } from "@/types/aave";
import { TokenTransferState } from "@/types/web3";
import TokenInputGroup from "@/components/ui/TokenInputGroup";
import { calculateApyWithIncentives } from "@/utils/lending/incentives";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { TrendingUp, Percent } from "lucide-react";
import { useSourceToken, useSourceChain } from "@/store/web3Store";
import { ensureCorrectWalletTypeForChain } from "@/utils/swap/walletMethods";
import { TokenImage } from "@/components/ui/TokenImage";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { calculateTokenPrice } from "@/utils/common";
import WalletConnectButton from "@/components/ui/WalletConnectButton";
import SubscriptNumber from "@/components/ui/SubscriptNumber";

import HealthFactorRiskDisplay from "@/components/ui/lending/AssetDetails/HealthFactorRiskDisplay";

interface WithdrawAssetModalProps {
  market: UnifiedReserveData;
  position?: UserSupplyPosition;
  userAddress: string | undefined;
  children: React.ReactNode;
  onWithdraw: (market: UnifiedReserveData, max: boolean) => void;
  tokenTransferState: TokenTransferState;
  healthFactor?: string | null;
}

const WithdrawAssetModal: React.FC<WithdrawAssetModalProps> = ({
  market,
  position,
  userAddress,
  children,
  tokenTransferState,
  onWithdraw,
}) => {
  const sourceToken = useSourceToken();
  const sourceChain = useSourceChain();

  const sourceWalletConnected = ensureCorrectWalletTypeForChain(sourceChain);

  const maxWithdrawableTokens = position
    ? parseFloat(position.supply.balance.amount.value) || 0
    : 0;
  const maxWithdrawableUsd = position
    ? parseFloat(position.supply.balance.usd) || 0
    : 0;
  const maxWithdrawableTokensString =
    position?.supply.balance.amount.value || "0";

  // Track if user clicked the max button
  const [maxButtonClicked, setMaxButtonClicked] = useState(false);

  // Reset max button state if user manually changes amount
  useEffect(() => {
    if (
      maxButtonClicked &&
      tokenTransferState.amount !== maxWithdrawableTokensString
    ) {
      setMaxButtonClicked(false);
    }
  }, [
    tokenTransferState.amount,
    maxWithdrawableTokensString,
    maxButtonClicked,
  ]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-m max-h-[80vh] overflow-hidden bg-[#18181B] border border-[#27272A] text-white flex flex-col">
        <DialogHeader className="border-b border-[#27272A] pb-4 flex-shrink-0 text-left">
          <h2 className="text-lg font-semibold">
            withdraw {market.underlyingToken.symbol}
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
            featuredTokensDescription="directly withdraw"
            disableTokenSelect={true}
            disableWalletBalance={true}
          />

          {/* Max Withdrawable Amount */}
          {position && (
            <div className="mt-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="text-sm text-[#A1A1AA]">max withdrawable</div>
                <div className="flex flex-col items-end">
                  <div className="text-sm font-mono font-semibold text-green-300">
                    <SubscriptNumber value={maxWithdrawableTokensString} />{" "}
                    {market.underlyingToken.symbol}
                  </div>
                  <div className="text-xs font-mono text-[#71717A]">
                    {formatCurrency(maxWithdrawableUsd)}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    tokenTransferState.setAmount(
                      position.supply.balance.amount.value,
                    );
                    setMaxButtonClicked(true);
                  }}
                  className="px-1 py-0.5 rounded-md bg-green-500 bg-opacity-25 text-green-500 text-xs cursor-pointer"
                >
                  max
                </button>
                <span className="text-xs text-[#A1A1AA]">
                  from your supply position
                </span>
              </div>
            </div>
          )}

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
                  please select a token to withdraw
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-[#A1A1AA]">you will withdraw</div>
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

          {/* Asset Supply Details */}
          <div className="mt-4 bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              withdraw details
            </h3>

            <div className="space-y-3">
              {/* Supply APY being earned */}
              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <Percent className="w-3 h-3 text-[#A1A1AA]" />
                  <span className="text-sm text-[#A1A1AA]">current APY</span>
                </div>
                <div className="text-sm font-mono font-semibold text-green-400">
                  {formatPercentage(
                    calculateApyWithIncentives(
                      market.supplyData.apy,
                      0,
                      market.incentives,
                    ).finalSupplyAPY,
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
            operation="withdraw"
            className="mt-4"
          />

          <BrandedButton
            onClick={async () => {
              onWithdraw(market, maxButtonClicked);
            }}
            disabled={
              !tokenTransferState.amount ||
              parseFloat(tokenTransferState.amount) <= 0 ||
              !sourceWalletConnected ||
              parseFloat(tokenTransferState.amount) > maxWithdrawableTokens
            }
            className="mt-3 flex-1 justify-center bg-green-500/20 hover:bg-green-500/30 hover:text-green-200 text-green-300 border-green-700/50 hover:border-green-600 transition-all duration-200 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            buttonText={
              parseFloat(tokenTransferState.amount || "0") >
                maxWithdrawableTokens &&
              parseFloat(tokenTransferState.amount || "0") > 0
                ? "exceeds balance"
                : "withdraw"
            }
            iconName="TrendingUp"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawAssetModal;
