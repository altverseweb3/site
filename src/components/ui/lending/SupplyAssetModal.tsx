"use client";

import React, { useState, useEffect } from "react";
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
import useWeb3Store from "@/store/web3Store";
import { TokenImage } from "@/components/ui/TokenImage";
import { TransactionDetails } from "@/components/ui/TransactionDetails";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { calculateTokenPrice } from "@/utils/common";
import ProgressTracker, {
  Step,
  createStep,
  StepState,
} from "@/components/ui/ProgressTracker";

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

  // Store functions for updating swap state
  const setSourceToken = useWeb3Store((state) => state.setSourceToken);
  const setSourceChain = useWeb3Store((state) => state.setSourceChain);
  const setAmount = tokenTransferState.setAmount;

  const isDirectSupply =
    sourceToken && destinationToken && sourceToken.id === destinationToken.id;

  const [swapCompleted, setSwapCompleted] = useState(false);
  const [hasInitiatedSwap, setHasInitiatedSwap] = useState(false);
  const [updateStep, setUpdateStep] = useState<
    "none" | "amount" | "chain" | "token" | "complete"
  >("none");
  const [showProgressTracker, setShowProgressTracker] = useState(false);

  // Debug logging for token transfer state
  useEffect(() => {
    console.log("SupplyAssetModal: tokenTransferState changed:", {
      swapId: tokenTransferState.swapId,
      swapStatus: tokenTransferState.swapStatus,
      isTracking: tokenTransferState.isTracking,
      isProcessing: tokenTransferState.isProcessing,
      hasInitiatedSwap,
      swapCompleted,
      updateStep,
    });
  }, [
    tokenTransferState.swapId,
    tokenTransferState.swapStatus,
    tokenTransferState.isTracking,
    tokenTransferState.isProcessing,
    hasInitiatedSwap,
    swapCompleted,
    updateStep,
  ]);

  // Monitor swap completion status
  useEffect(() => {
    if (
      hasInitiatedSwap &&
      tokenTransferState.swapStatus &&
      updateStep === "none"
    ) {
      const status = tokenTransferState.swapStatus.status;
      console.log("SupplyAssetModal: Swap status changed to:", status);
      if (status === "COMPLETED") {
        console.log("SupplyAssetModal: Setting swapCompleted to true");
        setSwapCompleted(true);

        // Start the state update sequence if we have the required data
        if (destinationToken && tokenTransferState.receiveAmount) {
          console.log("SupplyAssetModal: Starting state update sequence");
          setUpdateStep("amount");
        }
      } else if (status === "FAILED" || status === "REFUNDED") {
        // Reset states on failure
        console.log("SupplyAssetModal: Resetting states due to failure");
        setSwapCompleted(false);
        setHasInitiatedSwap(false);
        setUpdateStep("none");
      }
    }
  }, [
    hasInitiatedSwap,
    tokenTransferState.swapStatus,
    updateStep,
    destinationToken,
    tokenTransferState.receiveAmount,
  ]);

  // Show ProgressTracker when swap is initiated (and persist until modal close)
  useEffect(() => {
    if (hasInitiatedSwap && !isDirectSupply && !showProgressTracker) {
      console.log("SupplyAssetModal: Showing ProgressTracker for swap flow");
      setShowProgressTracker(true);
    }
  }, [hasInitiatedSwap, isDirectSupply, showProgressTracker]);

  // Sequential state updates after swap completion
  useEffect(() => {
    if (updateStep === "amount" && tokenTransferState.receiveAmount) {
      console.log(
        "SupplyAssetModal: Step 1 - Updating amount to:",
        tokenTransferState.receiveAmount,
      );
      setAmount(tokenTransferState.receiveAmount);
      setUpdateStep("chain");
    } else if (updateStep === "chain" && destinationChain) {
      console.log(
        "SupplyAssetModal: Step 2 - Updating source chain to:",
        destinationChain.name,
      );
      setSourceChain(destinationChain);
      setUpdateStep("token");
    } else if (updateStep === "token" && destinationToken) {
      console.log(
        "SupplyAssetModal: Step 3 - Updating source token to:",
        destinationToken.ticker,
      );
      setSourceToken(destinationToken);
      setUpdateStep("complete");
    }
  }, [
    updateStep,
    tokenTransferState.receiveAmount,
    destinationChain,
    destinationToken,
    setAmount,
    setSourceChain,
    setSourceToken,
  ]);

  // Monitor swap processing state - reset if swap stops processing without a swapId
  useEffect(() => {
    if (
      hasInitiatedSwap &&
      !tokenTransferState.isProcessing &&
      !tokenTransferState.swapId
    ) {
      // Swap stopped processing but no swap ID was generated - likely failed at approval/initiation
      setHasInitiatedSwap(false);
      setSwapCompleted(false);
      setUpdateStep("none");
    }
  }, [
    hasInitiatedSwap,
    tokenTransferState.isProcessing,
    tokenTransferState.swapId,
  ]);

  // Reset states when modal is closed or tokens change
  useEffect(() => {
    if (isDirectSupply) {
      setSwapCompleted(false);
      setHasInitiatedSwap(false);
      setUpdateStep("none");
      setShowProgressTracker(false);
    }
  }, [isDirectSupply]);

  // Create progress steps for swap-then-supply flow
  const getSwapSupplySteps = (): Step[] => {
    if (isDirectSupply) return []; // No steps needed for direct supply

    const steps: Step[] = [];

    // Get current swap status
    const swapStatus = tokenTransferState.swapStatus?.status;

    // Step 1: Cross-chain swap
    let swapState: StepState = "pending";
    let swapDescription =
      sourceToken && destinationToken
        ? `${sourceToken.ticker} → ${destinationToken.ticker}`
        : "preparing swap...";

    if (!hasInitiatedSwap) {
      swapState = "pending";
    } else if (hasInitiatedSwap && !swapCompleted) {
      swapState = "active";
      if (tokenTransferState.isProcessing) {
        swapDescription =
          sourceToken && destinationToken
            ? `swapping ${sourceToken.ticker} to ${destinationToken.ticker}...`
            : "processing swap...";
      }
    } else if (swapCompleted || swapStatus === "COMPLETED") {
      swapState = "completed";
    } else if (swapStatus === "FAILED" || swapStatus === "REFUNDED") {
      swapState = "failed";
    }

    steps.push(
      createStep("swap", "cross-chain swap", swapDescription, swapState),
    );

    // Step 2: Supply to lending pool
    let supplyState: StepState = "pending";
    let supplyDescription = destinationToken
      ? `supply ${destinationToken.ticker} to ${market.underlyingToken.symbol} market`
      : "preparing supply...";

    if (!swapCompleted) {
      supplyState = "pending";
    } else if (
      swapCompleted &&
      updateStep !== "none" &&
      updateStep !== "complete"
    ) {
      supplyState = "active";
      supplyDescription = "updating token state for supply...";
    } else if (updateStep === "complete") {
      supplyState = "pending"; // Ready for user to click supply
      supplyDescription = destinationToken
        ? `ready to supply ${destinationToken.ticker}`
        : "ready to supply";
    }

    steps.push(
      createStep(
        "supply",
        "supply to lending pool",
        supplyDescription,
        supplyState,
      ),
    );

    return steps;
  };

  // Handle modal close - reset source to destination to pause quoting
  const handleModalClose = (open: boolean) => {
    if (!open && destinationToken && destinationChain) {
      // Modal is being closed - reset source to match destination to pause quotes
      console.log(
        "SupplyAssetModal: Modal closed, resetting source to destination",
      );
      setSourceToken(destinationToken);
      setSourceChain(destinationChain);

      // Also reset all swap-related states
      setSwapCompleted(false);
      setHasInitiatedSwap(false);
      setUpdateStep("none");
      setShowProgressTracker(false);
    }
  };

  return (
    <Dialog onOpenChange={handleModalClose}>
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

          {/* Progress Tracker - Show during swap-then-supply flow (persist until modal close) */}
          {showProgressTracker && (
            <div className="mt-4">
              <ProgressTracker
                steps={getSwapSupplySteps()}
                title="processing your transaction"
                show={true}
              />
            </div>
          )}

          {/* Transaction Summary */}
          <div className="mt-4 bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-white">transaction preview</div>
            </div>

            {/* Quote Error Display */}
            {!isDirectSupply &&
              tokenTransferState.quoteError &&
              (!tokenTransferState.receiveAmount ||
                tokenTransferState.receiveAmount === "0") && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="text-sm text-red-400">
                    {tokenTransferState.quoteError}
                  </div>
                </div>
              )}

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

              {/* Collateralization Status */}
              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-[#A1A1AA]" />
                  <span className="text-sm text-[#A1A1AA]">
                    can be collateral
                  </span>
                </div>
                <div
                  className={`text-sm font-mono font-semibold ${
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
            onClick={async () => {
              console.log("SupplyAssetModal: Button clicked", {
                isDirectSupply,
                swapCompleted,
                hasInitiatedSwap,
              });

              if (isDirectSupply) {
                console.log("SupplyAssetModal: Direct supply");
                onSupply(market);
              } else if (swapCompleted) {
                console.log("SupplyAssetModal: Swap completed, now supply");
                onSupply(market);
              } else if (!hasInitiatedSwap) {
                console.log("SupplyAssetModal: Initiating swap");
                // Initiate swap
                setHasInitiatedSwap(true);
                try {
                  const result = await tokenTransferState.handleTransfer();
                  console.log(
                    "SupplyAssetModal: handleTransfer result:",
                    result,
                  );
                  // If handleTransfer returns undefined/void, it likely failed
                  if (!result) {
                    setHasInitiatedSwap(false);
                  }
                } catch (error) {
                  // Reset on error
                  console.error("Swap initiation failed:", error);
                  setHasInitiatedSwap(false);
                  setSwapCompleted(false);
                  setUpdateStep("none");
                  setShowProgressTracker(false);
                }
              } else {
                console.log(
                  "SupplyAssetModal: Button clicked but no action taken",
                );
              }
            }}
            disabled={
              tokenTransferState.isButtonDisabled ||
              (hasInitiatedSwap && !swapCompleted)
            }
            className="mt-3 flex-1 justify-center bg-green-500/20 hover:bg-green-500/30 hover:text-green-200 text-green-300 border-green-700/50 hover:border-green-600 transition-all duration-200 py-3 font-medium"
            buttonText={
              isDirectSupply
                ? "supply"
                : swapCompleted
                  ? "supply"
                  : hasInitiatedSwap
                    ? "swapping..."
                    : "swap"
            }
            iconName="Coins"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupplyAssetModal;
