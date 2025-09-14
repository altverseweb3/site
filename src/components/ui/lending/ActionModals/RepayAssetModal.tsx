"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { Percent, CreditCard, ArrowDown } from "lucide-react";
import Image from "next/image";
import {
  useSourceToken,
  useDestinationToken,
  useSourceChain,
  useDestinationChain,
} from "@/store/web3Store";
import useWeb3Store from "@/store/web3Store";
import { ensureCorrectWalletTypeForChain } from "@/utils/swap/walletMethods";
import { TokenImage } from "@/components/ui/TokenImage";
import { TransactionDetails } from "@/components/ui/TransactionDetails";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { calculateTokenPrice } from "@/utils/common";
import ProgressTracker, {
  Step,
  createStep,
  StepState,
} from "@/components/ui/ProgressTracker";
import WalletConnectButton from "@/components/ui/WalletConnectButton";
import SubscriptNumber from "@/components/ui/SubscriptNumber";
import {
  HealthFactorPreviewArgs,
  HealthFactorPreviewResult,
} from "@/hooks/lending/useHealthFactorPreviewOperations";
import HealthFactorRiskDisplay from "@/components/ui/lending/AssetDetails/HealthFactorRiskDisplay";
import { evmAddress } from "@aave/react";

interface RepayAssetModalProps {
  market: UnifiedMarketData;
  position?: UserBorrowPosition;
  userAddress: string | null;
  children: React.ReactNode;
  onRepay: (market: UnifiedMarketData, max: boolean) => void;
  onHealthFactorPreview?: (
    args: HealthFactorPreviewArgs,
  ) => Promise<HealthFactorPreviewResult>;
  tokenTransferState: TokenTransferState;
}

const RepayAssetModal: React.FC<RepayAssetModalProps> = ({
  market,
  position,
  userAddress,
  children,
  tokenTransferState,
  onRepay,
  onHealthFactorPreview,
}) => {
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const sourceChain = useSourceChain();
  const destinationChain = useDestinationChain();

  // Store functions for updating swap state
  const setSourceToken = useWeb3Store((state) => state.setSourceToken);
  const setSourceChain = useWeb3Store((state) => state.setSourceChain);
  const setAmount = tokenTransferState.setAmount;

  const sourceWalletConnected = ensureCorrectWalletTypeForChain(sourceChain);

  const isDirectRepay =
    sourceToken &&
    destinationToken &&
    sourceToken.address === destinationToken.address &&
    sourceToken.chainId === destinationToken.chainId;

  // Swap state management - using proper tracking lifecycle
  const [swapInitiated, setSwapInitiated] = useState(false);
  const [swapCompleted, setSwapCompleted] = useState(false);
  const [stateUpdateStep, setStateUpdateStep] = useState<
    "none" | "amount" | "chain" | "token" | "complete"
  >("none");
  const [isSwapThenRepayFlow, setIsSwapThenRepayFlow] = useState(false); // Track if we're in swap-then-repay mode
  const [maxButtonClicked, setMaxButtonClicked] = useState(false); // Track if user clicked the max button

  // Ref to track previous tracking state
  const previousTrackingState = useRef(tokenTransferState.isTracking);

  // Health factor preview state
  const [healthFactorPreview, setHealthFactorPreview] =
    useState<HealthFactorPreviewResult | null>(null);
  const onHealthFactorPreviewRef = useRef(onHealthFactorPreview);

  const maxRepayableTokens =
    parseFloat(position?.borrow.debt.amount.value) || 0;
  const maxRepayableUsd = parseFloat(position?.borrow.debt.usd.value) || 0;
  const maxRepayableTokensString = position?.borrow.debt.amount.value || "0";

  // Debug logging for token transfer state
  useEffect(() => {
    console.log("RepayAssetModal: tokenTransferState changed:", {
      swapId: tokenTransferState.swapId,
      swapStatus: tokenTransferState.swapStatus,
      isTracking: tokenTransferState.isTracking,
      isProcessing: tokenTransferState.isProcessing,
      swapInitiated,
      swapCompleted,
      stateUpdateStep,
    });
  }, [
    tokenTransferState.swapId,
    tokenTransferState.swapStatus,
    tokenTransferState.isTracking,
    tokenTransferState.isProcessing,
    swapInitiated,
    swapCompleted,
    stateUpdateStep,
  ]);

  // Monitor for tracking completion (when swap actually finishes and user receives funds)
  useEffect(() => {
    // Detect when tracking stops (swap completed)
    if (
      previousTrackingState.current &&
      !tokenTransferState.isTracking &&
      tokenTransferState.swapId
    ) {
      // Tracking just stopped and we have a swapId - swap completed!
      const finalStatus = tokenTransferState.swapStatus?.status;
      console.log(
        "RepayAssetModal: Swap tracking completed with status:",
        finalStatus,
      );

      if (
        finalStatus === "COMPLETED" &&
        destinationToken &&
        tokenTransferState.receiveAmount
      ) {
        console.log(
          "RepayAssetModal: Swap completed successfully, starting state transition",
        );
        setSwapCompleted(true);
        setStateUpdateStep("amount");
      } else if (finalStatus === "FAILED" || finalStatus === "REFUNDED") {
        console.log("RepayAssetModal: Swap failed, resetting states");
        setSwapCompleted(false);
        setSwapInitiated(false);
        setStateUpdateStep("none");
        setIsSwapThenRepayFlow(false);
      }
    }

    previousTrackingState.current = tokenTransferState.isTracking;
  }, [
    tokenTransferState.isTracking,
    tokenTransferState.swapId,
    tokenTransferState.swapStatus,
    tokenTransferState.receiveAmount,
    destinationToken,
  ]);

  // Sequential state updates after swap completion
  useEffect(() => {
    if (stateUpdateStep === "amount" && tokenTransferState.receiveAmount) {
      console.log(
        "RepayAssetModal: Step 1 - Updating amount to:",
        tokenTransferState.receiveAmount,
      );
      setAmount(tokenTransferState.receiveAmount);
      setStateUpdateStep("chain");
    } else if (stateUpdateStep === "chain" && destinationChain) {
      console.log(
        "RepayAssetModal: Step 2 - Updating source chain to:",
        destinationChain.name,
      );
      setSourceChain(destinationChain);
      setStateUpdateStep("token");
    } else if (stateUpdateStep === "token" && destinationToken) {
      console.log(
        "RepayAssetModal: Step 3 - Updating source token to:",
        destinationToken.ticker,
      );
      setSourceToken(destinationToken);
      setStateUpdateStep("complete");
    }
  }, [
    stateUpdateStep,
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
      swapInitiated &&
      !tokenTransferState.isProcessing &&
      !tokenTransferState.swapId
    ) {
      // Swap stopped processing but no swap ID was generated - likely failed at approval/initiation
      setSwapInitiated(false);
      setSwapCompleted(false);
      setStateUpdateStep("none");
      setIsSwapThenRepayFlow(false);
    }
  }, [
    swapInitiated,
    tokenTransferState.isProcessing,
    tokenTransferState.swapId,
  ]);

  // Reset states when switching to direct repay mode (but not during swap-then-repay flow)
  useEffect(() => {
    if (isDirectRepay && !isSwapThenRepayFlow) {
      setSwapCompleted(false);
      setSwapInitiated(false);
      setStateUpdateStep("none");
    }
  }, [isDirectRepay, isSwapThenRepayFlow]);

  // Update ref when onHealthFactorPreview changes
  useEffect(() => {
    onHealthFactorPreviewRef.current = onHealthFactorPreview;
  }, [onHealthFactorPreview]);

  // Health factor preview effect - call when amount changes
  useEffect(() => {
    const effectiveAmount = isDirectRepay
      ? tokenTransferState.amount || "0"
      : tokenTransferState.receiveAmount || "0";

    // Only calculate if we have an amount, destination token, user address, and the preview function
    if (
      !effectiveAmount ||
      effectiveAmount === "0" ||
      !destinationToken?.address ||
      !userAddress ||
      !onHealthFactorPreviewRef.current
    ) {
      setHealthFactorPreview(null);
      return;
    }

    const calculateHealthFactor = async () => {
      try {
        const result = await onHealthFactorPreviewRef.current!({
          operation: "repay",
          market,
          amount: effectiveAmount,
          currency: evmAddress(destinationToken.address),
          chainId: market.marketInfo.chain.chainId,
          userAddress: evmAddress(userAddress),
          useNative: false,
          max: maxButtonClicked,
        });
        setHealthFactorPreview(result);
      } catch (error) {
        console.error("Health factor preview failed:", error);
        setHealthFactorPreview(null);
      }
    };

    // Debounce the calculation
    const timeoutId = setTimeout(calculateHealthFactor, 300);
    return () => clearTimeout(timeoutId);
  }, [
    isDirectRepay,
    tokenTransferState.amount,
    tokenTransferState.receiveAmount,
    destinationToken?.address,
    userAddress,
    market.marketInfo.chain.chainId,
    market.marketInfo.address,
    maxButtonClicked,
    market,
  ]);

  // Reset max button state if user manually changes amount
  useEffect(() => {
    if (
      maxButtonClicked &&
      tokenTransferState.amount !== maxRepayableTokensString
    ) {
      setMaxButtonClicked(false);
    }
  }, [tokenTransferState.amount, maxRepayableTokensString, maxButtonClicked]);

  // Create progress steps for swap-then-repay flow using proper tracking state
  const getSwapRepaySteps = (): Step[] => {
    if (
      (!isSwapThenRepayFlow && isDirectRepay) ||
      (!tokenTransferState.isTracking &&
        !swapInitiated &&
        !tokenTransferState.swapId &&
        !isSwapThenRepayFlow)
    ) {
      return []; // No steps needed for direct repay (not swap-then-repay) or when no swap activity
    }

    const steps: Step[] = [];

    // Get current swap status from proper tracking
    const swapStatus = tokenTransferState.swapStatus?.status;
    const isTracking = tokenTransferState.isTracking;
    const swapId = tokenTransferState.swapId;

    // Step 1: Cross-chain swap - using proper tracking states
    let swapState: StepState = "pending";
    let swapDescription =
      sourceToken && destinationToken
        ? `${sourceToken.ticker} → ${destinationToken.ticker}`
        : "preparing swap...";

    if (!swapId && swapInitiated) {
      // Swap initiated but no swap ID yet
      swapState = "active";
      swapDescription = "initiating swap...";
    } else if (swapId && (isTracking || tokenTransferState.isProcessing)) {
      // Swap is being tracked/processed
      swapState = "active";
      swapDescription =
        sourceToken && destinationToken
          ? `swapping ${sourceToken.ticker} to ${destinationToken.ticker}...`
          : "processing swap...";
    } else if (swapStatus === "COMPLETED") {
      swapState = "completed";
    } else if (swapStatus === "FAILED" || swapStatus === "REFUNDED") {
      swapState = "failed";
    }

    steps.push(
      createStep("swap", "cross-chain swap", swapDescription, swapState),
    );

    // Step 2: Repay to lending pool
    let repayState: StepState = "pending";
    let repayDescription = destinationToken
      ? `repay ${destinationToken.ticker} debt`
      : "preparing repay...";

    // Only show repay as active/ready after swap completes
    if (swapStatus === "COMPLETED") {
      if (stateUpdateStep !== "none" && stateUpdateStep !== "complete") {
        repayState = "active";
        repayDescription = "preparing tokens for repay...";
      } else if (stateUpdateStep === "complete") {
        repayState = "pending"; // Ready for user to click repay
        repayDescription = destinationToken
          ? `ready to repay ${destinationToken.ticker}`
          : "ready to repay";
      }
    }

    steps.push(createStep("repay", "repay debt", repayDescription, repayState));

    return steps;
  };

  // Handle modal close - reset source to destination to pause quoting
  const handleModalClose = (open: boolean) => {
    if (!open && destinationToken && destinationChain) {
      // Modal is being closed - reset source to match destination to pause quotes
      console.log(
        "RepayAssetModal: Modal closed, resetting source to destination",
      );
      setSourceToken(destinationToken);
      setSourceChain(destinationChain);

      // Also reset all swap-related states
      setSwapCompleted(false);
      setSwapInitiated(false);
      setStateUpdateStep("none");
      setIsSwapThenRepayFlow(false);
    }
  };

  return (
    <Dialog onOpenChange={handleModalClose}>
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
            featuredTokens={[destinationToken!]}
            featuredTokensDescription="directly repay"
          />
          {!sourceWalletConnected && (
            <div className="mt-4 flex justify-end">
              <WalletConnectButton
                walletType={sourceChain.walletType}
                className="w-auto"
              />
            </div>
          )}
          {/* Progress Tracker - Show during swap-then-repay flow */}
          {(tokenTransferState.isTracking ||
            swapInitiated ||
            isSwapThenRepayFlow) && (
            <div className="mt-4">
              <ProgressTracker
                steps={getSwapRepaySteps()}
                title="processing your transaction"
                show={true}
              />
            </div>
          )}

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
                  setMaxButtonClicked(true);
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

          {/* Transaction Summary */}
          <div className="mt-3 bg-[#1F1F23] border border-[#27272A] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-white">transaction preview</div>
            </div>

            {!sourceToken ? (
              <div className="text-center py-4">
                <div className="text-sm text-[#A1A1AA]">
                  please select a source token
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {isDirectRepay ? (
                    // Direct repay
                    <div className="space-y-1">
                      <div className="text-sm text-[#A1A1AA]">
                        you will repay
                      </div>
                      <div className="flex items-start gap-3">
                        <TokenImage
                          token={sourceToken}
                          chain={sourceChain}
                          size="sm"
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-mono text-white-400 font-semibold">
                              <SubscriptNumber
                                value={tokenTransferState.amount || "0"}
                              />
                            </span>
                            <span className="text-white">
                              {sourceToken.ticker}
                            </span>
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
                    // Swap + repay
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="text-sm text-[#A1A1AA]">
                          you will swap
                        </div>
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
                                <SubscriptNumber
                                  value={tokenTransferState.amount || "0"}
                                />
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

                      <div className="space-y-1">
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
                                <SubscriptNumber
                                  value={
                                    tokenTransferState.receiveAmount || "0"
                                  }
                                />
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
                        then repay debt
                      </div>

                      {/* Show excess amount warning if swap will exceed debt */}
                      {(() => {
                        const receiveAmount = parseFloat(
                          tokenTransferState.receiveAmount || "0",
                        );
                        const willExceedDebt =
                          receiveAmount > maxRepayableTokens &&
                          maxRepayableTokens > 0;
                        const excessAmount = willExceedDebt
                          ? receiveAmount - maxRepayableTokens
                          : 0;

                        if (willExceedDebt) {
                          return (
                            <div className="mt-1 p-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-xs">
                              <span className="text-amber-400">
                                <strong>note:</strong> excess ~
                                {excessAmount.toFixed(6)}{" "}
                                {destinationToken?.ticker} will remain in wallet
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {!isDirectRepay && (
            <TransactionDetails
              estimatedTime={tokenTransferState.estimatedTimeSeconds}
            />
          )}

          {/* Asset Repay Details */}
          <div className="mt-3 bg-[#1F1F23] border border-[#27272A] rounded-lg p-3">
            <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-400" />
              repay details
            </h3>

            <div className="space-y-2">
              {/* Current Borrow APY */}
              <div className="flex justify-between items-center py-1">
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
          {healthFactorPreview?.success &&
            ((isDirectRepay
              ? tokenTransferState.amount
              : tokenTransferState.receiveAmount) || "0") !== "0" && (
              <div className="mt-4">
                <HealthFactorRiskDisplay
                  healthFactorBefore={healthFactorPreview.healthFactorBefore}
                  healthFactorAfter={healthFactorPreview.healthFactorAfter}
                  liquidationRisk={healthFactorPreview.liquidationRisk}
                />
              </div>
            )}

          <BrandedButton
            onClick={async () => {
              console.log("RepayAssetModal: Button clicked", {
                isDirectRepay,
                swapCompleted,
                swapInitiated,
                isSwapThenRepayFlow,
              });

              if (isDirectRepay && !isSwapThenRepayFlow) {
                console.log("RepayAssetModal: Direct repay");
                // Use the max button state instead of comparing amounts
                onRepay(market, maxButtonClicked);
              } else if (
                swapCompleted ||
                (isDirectRepay && isSwapThenRepayFlow)
              ) {
                console.log("RepayAssetModal: Repay after swap completion");
                // For swap-then-repay, use max button state
                console.log("RepayAssetModal: Swap repay calculation", {
                  maxButtonClicked,
                });
                onRepay(market, maxButtonClicked);
                // Clear the swap-then-repay flag after repay action
                setIsSwapThenRepayFlow(false);
              } else if (!swapInitiated) {
                console.log("RepayAssetModal: Initiating swap");
                // Initiate swap and mark as swap-then-repay flow
                setSwapInitiated(true);
                setIsSwapThenRepayFlow(true);
                try {
                  const result = await tokenTransferState.handleTransfer();
                  console.log(
                    "RepayAssetModal: handleTransfer result:",
                    result,
                  );
                  // If handleTransfer returns undefined/void, it likely failed
                  if (!result) {
                    setSwapInitiated(false);
                    setIsSwapThenRepayFlow(false);
                  }
                } catch (error) {
                  // Reset on error
                  console.error("Swap initiation failed:", error);
                  setSwapInitiated(false);
                  setSwapCompleted(false);
                  setStateUpdateStep("none");
                  setIsSwapThenRepayFlow(false);
                }
              } else {
                console.log(
                  "RepayAssetModal: Button clicked but no action taken",
                );
              }
            }}
            disabled={Boolean(
              tokenTransferState.isButtonDisabled ||
                (swapInitiated && !swapCompleted) ||
                !sourceWalletConnected ||
                // Only disable for direct repay if amount exceeds debt
                (isDirectRepay &&
                  parseFloat(tokenTransferState.amount || "0") >
                    maxRepayableTokens) ||
                // Disable if swap quote returns zero (indicates quote error)
                (!isDirectRepay &&
                  parseFloat(tokenTransferState.receiveAmount || "0") === 0 &&
                  parseFloat(tokenTransferState.amount || "0") > 0),
            )}
            className="mt-2 flex-1 justify-center bg-sky-500/20 hover:bg-sky-500/30 hover:text-sky-200 text-sky-300 border-sky-700/50 hover:border-sky-600 transition-all duration-200 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            buttonText={
              // Only show "exceeds debt balance" for direct repay
              isDirectRepay &&
              parseFloat(tokenTransferState.amount || "0") >
                maxRepayableTokens &&
              parseFloat(tokenTransferState.amount || "0") > 0
                ? "exceeds debt balance"
                : // Show quote error message for swap when receive amount is zero
                  !isDirectRepay &&
                    parseFloat(tokenTransferState.receiveAmount || "0") === 0 &&
                    parseFloat(tokenTransferState.amount || "0") > 0
                  ? "quote unavailable"
                  : isDirectRepay
                    ? "repay"
                    : swapCompleted
                      ? "repay"
                      : swapInitiated
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

export default RepayAssetModal;
