"use client";

import React, { useState, useEffect, useRef } from "react";
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
import {
  HealthFactorPreviewArgs,
  HealthFactorPreviewResult,
} from "@/hooks/lending/useHealthFactorPreviewOperations";
import HealthFactorRiskDisplay from "@/components/ui/lending/AssetDetails/HealthFactorRiskDisplay";
import { evmAddress } from "@aave/react";

interface SupplyAssetModalProps {
  market: UnifiedMarketData;
  userAddress: string | null;
  children: React.ReactNode;
  onSupply: (market: UnifiedMarketData) => void;
  onBorrow: (market: UnifiedMarketData) => void;
  onRepay?: (market: UserBorrowPosition) => void;
  onWithdraw?: (market: UserSupplyPosition) => void;
  onHealthFactorPreview?: (
    args: HealthFactorPreviewArgs,
  ) => Promise<HealthFactorPreviewResult>;
  tokenTransferState: TokenTransferState;
  healthFactor?: string | null;
}

const SupplyAssetModal: React.FC<SupplyAssetModalProps> = ({
  market,
  userAddress,
  children,
  tokenTransferState,
  onSupply,
  healthFactor,
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

  const isDirectSupply =
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
  const [isSwapThenSupplyFlow, setIsSwapThenSupplyFlow] = useState(false); // Track if we're in swap-then-supply mode

  // Ref to track previous tracking state
  const previousTrackingState = useRef(tokenTransferState.isTracking);

  // Health factor preview state
  const [healthFactorPreview, setHealthFactorPreview] =
    useState<HealthFactorPreviewResult | null>(null);
  const onHealthFactorPreviewRef = useRef(onHealthFactorPreview);

  // Debug logging for token transfer state
  useEffect(() => {
    console.log("SupplyAssetModal: tokenTransferState changed:", {
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
        "SupplyAssetModal: Swap tracking completed with status:",
        finalStatus,
      );

      if (
        finalStatus === "COMPLETED" &&
        destinationToken &&
        tokenTransferState.receiveAmount
      ) {
        console.log(
          "SupplyAssetModal: Swap completed successfully, starting state transition",
        );
        setSwapCompleted(true);
        setStateUpdateStep("amount");
      } else if (finalStatus === "FAILED" || finalStatus === "REFUNDED") {
        console.log("SupplyAssetModal: Swap failed, resetting states");
        setSwapCompleted(false);
        setSwapInitiated(false);
        setStateUpdateStep("none");
        setIsSwapThenSupplyFlow(false);
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
        "SupplyAssetModal: Step 1 - Updating amount to:",
        tokenTransferState.receiveAmount,
      );
      setAmount(tokenTransferState.receiveAmount);
      setStateUpdateStep("chain");
    } else if (stateUpdateStep === "chain" && destinationChain) {
      console.log(
        "SupplyAssetModal: Step 2 - Updating source chain to:",
        destinationChain.name,
      );
      setSourceChain(destinationChain);
      setStateUpdateStep("token");
    } else if (stateUpdateStep === "token" && destinationToken) {
      console.log(
        "SupplyAssetModal: Step 3 - Updating source token to:",
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
      setIsSwapThenSupplyFlow(false);
    }
  }, [
    swapInitiated,
    tokenTransferState.isProcessing,
    tokenTransferState.swapId,
  ]);

  // Reset states when switching to direct supply mode (but not during swap-then-supply flow)
  useEffect(() => {
    if (isDirectSupply && !isSwapThenSupplyFlow) {
      setSwapCompleted(false);
      setSwapInitiated(false);
      setStateUpdateStep("none");
    }
  }, [isDirectSupply, isSwapThenSupplyFlow]);

  // Update ref when onHealthFactorPreview changes
  useEffect(() => {
    onHealthFactorPreviewRef.current = onHealthFactorPreview;
  }, [onHealthFactorPreview]);

  // Health factor preview effect - call when amount changes
  useEffect(() => {
    const effectiveAmount = isDirectSupply
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
          operation: "supply",
          market,
          amount: effectiveAmount,
          currency: evmAddress(destinationToken.address),
          chainId: market.marketInfo.chain.chainId,
          userAddress: evmAddress(userAddress),
          useNative: false,
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
    isDirectSupply,
    tokenTransferState.amount,
    tokenTransferState.receiveAmount,
    destinationToken?.address,
    userAddress,
    market.marketInfo.chain.chainId,
    market.marketInfo.address,
    market,
  ]);

  // Create progress steps for swap-then-supply flow using proper tracking state
  const getSwapSupplySteps = (): Step[] => {
    if (
      (!isSwapThenSupplyFlow && isDirectSupply) ||
      (!tokenTransferState.isTracking &&
        !swapInitiated &&
        !tokenTransferState.swapId &&
        !isSwapThenSupplyFlow)
    ) {
      return []; // No steps needed for direct supply (not swap-then-supply) or when no swap activity
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

    // Step 2: Supply to lending pool
    let supplyState: StepState = "pending";
    let supplyDescription = destinationToken
      ? `supply ${destinationToken.ticker} to ${market.underlyingToken.symbol} market`
      : "preparing supply...";

    // Only show supply as active/ready after swap completes
    if (swapStatus === "COMPLETED") {
      if (stateUpdateStep !== "none" && stateUpdateStep !== "complete") {
        supplyState = "active";
        supplyDescription = "preparing tokens for supply...";
      } else if (stateUpdateStep === "complete") {
        supplyState = "pending"; // Ready for user to click supply
        supplyDescription = destinationToken
          ? `ready to supply ${destinationToken.ticker}`
          : "ready to supply";
      }
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
      setSwapInitiated(false);
      setStateUpdateStep("none");
      setIsSwapThenSupplyFlow(false);
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
          {!sourceWalletConnected && (
            <div className="mt-4 flex justify-end">
              <WalletConnectButton
                walletType={sourceChain.walletType}
                className="w-auto"
              />
            </div>
          )}
          {/* Progress Tracker - Show during swap-then-supply flow */}
          {(tokenTransferState.isTracking ||
            swapInitiated ||
            isSwapThenSupplyFlow) && (
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

            {!sourceToken ? (
              <div className="text-center py-4">
                <div className="text-sm text-[#A1A1AA]">
                  please select a source token
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {isDirectSupply ? (
                    // Direct supply
                    <div className="space-y-2">
                      <div className="text-sm text-[#A1A1AA]">
                        you will supply
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
                              {tokenTransferState.amount || "0"}
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
                    // Swap + supply
                    <div className="space-y-3">
                      <div className="space-y-2">
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
              </>
            )}
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

              {/* Current Health Factor */}
              {healthFactor && (
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-[#A1A1AA]" />
                    <span className="text-sm text-[#A1A1AA]">
                      current health factor
                    </span>
                  </div>
                  <div className="text-sm font-mono font-semibold text-blue-400">
                    {parseFloat(healthFactor).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Health Factor Risk Display */}
          {healthFactorPreview?.success &&
            healthFactorPreview.healthFactorAfter &&
            ((isDirectSupply
              ? tokenTransferState.amount
              : tokenTransferState.receiveAmount) || "0") !== "0" && (
              //  !isLoadingHealthFactor && (
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
              console.log("SupplyAssetModal: Button clicked", {
                isDirectSupply,
                swapCompleted,
                swapInitiated,
              });

              if (isDirectSupply && !isSwapThenSupplyFlow) {
                console.log("SupplyAssetModal: Direct supply");
                onSupply(market);
              } else if (
                swapCompleted ||
                (isDirectSupply && isSwapThenSupplyFlow)
              ) {
                console.log("SupplyAssetModal: Supply after swap completion");
                onSupply(market);
                // Clear the swap-then-supply flag after supply action
                setIsSwapThenSupplyFlow(false);
              } else if (!swapInitiated) {
                console.log("SupplyAssetModal: Initiating swap");
                // Initiate swap and mark as swap-then-supply flow
                setSwapInitiated(true);
                setIsSwapThenSupplyFlow(true);
                try {
                  const result = await tokenTransferState.handleTransfer();
                  console.log(
                    "SupplyAssetModal: handleTransfer result:",
                    result,
                  );
                  // If handleTransfer returns undefined/void, it likely failed
                  if (!result) {
                    setSwapInitiated(false);
                  }
                } catch (error) {
                  // Reset on error
                  console.error("Swap initiation failed:", error);
                  setSwapInitiated(false);
                  setSwapCompleted(false);
                  setStateUpdateStep("none");
                  setIsSwapThenSupplyFlow(false);
                }
              } else {
                console.log(
                  "SupplyAssetModal: Button clicked but no action taken",
                );
              }
            }}
            disabled={
              tokenTransferState.isButtonDisabled ||
              (swapInitiated && !swapCompleted) ||
              !sourceWalletConnected
            }
            className="mt-3 flex-1 justify-center bg-green-500/20 hover:bg-green-500/30 hover:text-green-200 text-green-300 border-green-700/50 hover:border-green-600 transition-all duration-200 py-3 font-medium"
            buttonText={
              isDirectSupply
                ? "supply"
                : swapCompleted
                  ? "supply"
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

export default SupplyAssetModal;
