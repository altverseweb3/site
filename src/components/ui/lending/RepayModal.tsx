"use client";

import { AlertCircle, Info } from "lucide-react";
import { TokenImage } from "@/components/ui/TokenImage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/StyledDialog";
import {
  BlueButton,
  GrayButton,
} from "@/components/ui/lending/SupplyButtonComponents";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useAaveInteract } from "@/utils/aave/interact";
import { RateMode } from "@/types/aave";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { getExplorerUrl } from "@/utils/common";
import { toast } from "sonner";
import { useState, useEffect, FC, ReactNode, ChangeEvent } from "react";
import { SupportedChainId } from "@/config/aave";
import type { Token, Chain } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";
import {
  getHealthFactorColor,
  calculateUserSupplyPositionsUSD,
  calculateUserBorrowPositionsUSD,
  calculateRepayTransactionImpact,
  getLTVColorClass,
} from "@/utils/aave/utils";
import { UserPosition, UserBorrowPosition } from "@/types/aave";
import { calculateUserMetrics } from "@/utils/aave/metricsCalculations";
import {
  formatHealthFactor,
  formatBalance,
  calculateRepayUSDValue,
  formatUSDAmount,
  getDebtTypeDisplay,
} from "@/utils/formatters";

// Main Repay Modal Component
interface RepayModalProps {
  token: Token;
  currentDebt?: string;
  borrowAPY?: string;
  stableDebt?: string;
  variableDebt?: string;
  healthFactor?: string;
  liquidationThreshold?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  onRepay?: (amount: string, rateMode: RateMode) => Promise<boolean>;
  children: ReactNode;
  isLoading?: boolean;
  userSupplyPositions?: UserPosition[];
  userBorrowPositions?: UserBorrowPosition[];
  oraclePrices?: Record<string, number>;
}

const RepayModal: FC<RepayModalProps> = ({
  token,
  currentDebt = "0.00",
  borrowAPY = "0.00%",
  stableDebt = "0.00",
  variableDebt = "0.00",
  healthFactor,
  liquidationThreshold = 85,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  onRepay = async () => true,
  children,
  isLoading = false,
  userSupplyPositions = [],
  userBorrowPositions = [],
  oraclePrices = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [repayMode, setRepayMode] = useState<RateMode>(RateMode.Variable); // Default to variable

  const { isEvmConnected, evmNetwork } = useWalletConnection();
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const { repay } = useAaveInteract();

  // Determine the appropriate repay mode based on debt composition
  useEffect(() => {
    const variableDebtNum = parseFloat(variableDebt) || 0;
    const stableDebtNum = parseFloat(stableDebt) || 0;

    // Default to variable if there's more variable debt, otherwise stable
    if (variableDebtNum >= stableDebtNum && variableDebtNum > 0) {
      setRepayMode(RateMode.Variable);
    } else if (stableDebtNum > 0) {
      setRepayMode(RateMode.Stable);
    }
  }, [variableDebt, stableDebt]);

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setRepayAmount(value);
    }
  };

  const handleMaxClick = () => {
    // Max should be the full debt amount, not limited by wallet balance
    const maxDebtAmount = parseFloat(currentDebt) || 0;
    setRepayAmount(maxDebtAmount.toString());
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (isOpen) {
      setRepayAmount("");
    } else {
      setRepayAmount("");
    }
  }, [isOpen, isMounted]);

  // Don't render on server to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  // Calculate USD values using utility functions with oracle prices
  const currentDebtUSD = calculateRepayUSDValue(
    currentDebt,
    token,
    oraclePrices,
  );
  const repayAmountNum = parseFloat(repayAmount) || 0;
  const repayAmountUSD = calculateRepayUSDValue(
    repayAmount,
    token,
    oraclePrices,
  );

  // Calculate USD positions using utility functions like other modals
  const userSupplyPositionsUSD = calculateUserSupplyPositionsUSD(
    userSupplyPositions,
    oraclePrices,
  );

  const userBorrowPositionsUSD = calculateUserBorrowPositionsUSD(
    userBorrowPositions,
    oraclePrices,
  );

  // Use passed props for metrics if userPositions are empty (from BorrowOwnedCard)
  // Otherwise calculate from user positions (if called with full position data)
  const hasPositionData =
    userSupplyPositions.length > 0 || userBorrowPositions.length > 0;

  const currentMetrics = hasPositionData
    ? calculateUserMetrics(userSupplyPositionsUSD, userBorrowPositionsUSD)
    : {
        netWorth: (totalCollateralUSD || 0) - (totalDebtUSD || 0),
        netAPY: null,
        healthFactor: healthFactor ? parseFloat(healthFactor) : Infinity,
        totalCollateralUSD: totalCollateralUSD || 0,
        totalDebtUSD: totalDebtUSD || 0,
        currentLTV:
          totalCollateralUSD > 0
            ? ((totalDebtUSD || 0) / totalCollateralUSD) * 100
            : 0,
        maxLTV: 80, // Default fallback
        liquidationThreshold: liquidationThreshold || 85,
      };

  // Calculate new health factor and LTV after repaying debt (similar to SupplyModal)
  const { newHealthFactor, newLTV } = calculateRepayTransactionImpact(
    repayAmountUSD,
    currentMetrics.totalCollateralUSD,
    currentMetrics.totalDebtUSD,
    currentMetrics.currentLTV,
    currentMetrics.healthFactor,
    currentMetrics.liquidationThreshold / 100, // Convert percentage to decimal
  );

  // Validation
  const maxDebtAmount = parseFloat(currentDebt) || 0;
  const walletBalanceNum = parseFloat(
    token.userBalance?.replace(/,/g, "") || "0",
  );

  const isAmountValid = repayAmountNum > 0 && repayAmountNum <= maxDebtAmount;
  const hasInsufficientBalance = repayAmountNum > walletBalanceNum;
  const isFormValid = isAmountValid && !isLoading && !isSubmitting;

  // Get debt type display using utility function
  const debtTypeDisplay = getDebtTypeDisplay(
    variableDebt,
    stableDebt,
    repayMode === RateMode.Variable ? "Variable" : "Stable",
  );

  const handleRepay = async () => {
    if (!isFormValid) return;

    // Check wallet connection
    if (!isEvmConnected) {
      toast.error("wallet not connected", {
        description: "please connect your wallet to continue",
      });
      return;
    }

    // Check if we have required token info
    if (
      !token.address ||
      token.address === "" ||
      token.address === "0x0000000000000000000000000000000000000000"
    ) {
      toast.error("token information missing", {
        description: `unable to find token contract address for ${token.ticker}`,
      });
      return;
    }

    // Check if we have valid decimals
    if (!token.decimals || token.decimals <= 0) {
      toast.error("token decimals missing", {
        description: `invalid token decimals for ${token.ticker}: ${token.decimals}`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current chain ID
      const currentChainId = evmNetwork?.chainId
        ? typeof evmNetwork.chainId === "string"
          ? parseInt(evmNetwork.chainId, 10)
          : evmNetwork.chainId
        : 1;

      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();

      // Call the Aave repay transaction
      const result = await repay({
        tokenAddress: token.address,
        amount: repayAmount,
        rateMode: repayMode,
        tokenDecimals: token.decimals,
        tokenSymbol: token.ticker,
        userAddress,
        chainId: currentChainId as SupportedChainId,
      });

      if (result.success) {
        toast.success("repayment successful!", {
          description: `successfully repaid ${repayAmount} ${token.ticker}`,
          action: result.txHash
            ? {
                label: "view transaction",
                onClick: () =>
                  window.open(
                    getExplorerUrl(result.txHash!, currentChainId),
                    "_blank",
                  ),
              }
            : undefined,
        });

        // Call the parent onRepay callback
        await onRepay(repayAmount, repayMode);

        // Close modal and reset form
        setIsOpen(false);
        setRepayAmount("");
      } else {
        toast.error("repayment failed", {
          description: result.error || "unknown error occurred",
        });
      }
    } catch (error) {
      console.error("Repay error:", error);
      toast.error("repayment failed", {
        description:
          error instanceof Error ? error.message : "unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const chain: Chain = getChainByChainId(token.chainId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[460px] bg-[#18181B] border-[#27272A] text-white">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <TokenImage token={token} chain={chain} size="sm" />
              <DialogTitle className="text-lg font-semibold">
                repay {token.ticker}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Debt Info */}
            <div className="space-y-3 p-4 bg-[#1A1A1A] rounded-lg border border-[#232326]">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">current debt</span>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {currentDebt} {token.ticker}
                  </div>
                  <div className="text-xs text-gray-400">
                    ${formatUSDAmount(currentDebtUSD)}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">debt type</span>
                <span className="text-sm text-red-400">{debtTypeDisplay}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">borrow apy</span>
                <span className="text-sm text-red-400">{borrowAPY}</span>
              </div>
            </div>

            {/* Repay Amount Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-300">
                  repay amount
                </label>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-[#A1A1AA]">
                    balance: {formatBalance(token.userBalance || "0")}{" "}
                    {token.ticker}
                  </div>
                  <button
                    type="button"
                    onClick={handleMaxClick}
                    className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-500 hover:text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    max
                  </button>
                </div>
              </div>

              <div className="relative">
                <Input
                  type="text"
                  placeholder="0.00"
                  value={repayAmount}
                  onChange={handleAmountChange}
                  className="bg-[#1A1A1A] border-[#232326] text-white"
                />
              </div>

              {repayAmountNum > 0 && (
                <div className="text-xs text-gray-400">
                  ≈ ${formatUSDAmount(repayAmountUSD)} USD
                </div>
              )}

              {/* Validation Messages */}
              {repayAmount && !isAmountValid && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  {repayAmountNum > maxDebtAmount
                    ? `amount exceeds debt (${formatBalance(maxDebtAmount.toString())} ${token.ticker})`
                    : "please enter a valid amount"}
                </div>
              )}

              {/* Insufficient balance warning (but don't prevent submission) */}
              {repayAmount && isAmountValid && hasInsufficientBalance && (
                <div className="flex items-start gap-2 text-yellow-400 text-xs">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <div className="break-words">
                    insufficient wallet balance (have:{" "}
                    {formatBalance(walletBalanceNum.toString())}{" "}
                    {token.ticker.toLowerCase()})
                  </div>
                </div>
              )}
            </div>

            {/* Health Factor Display - Using correct repay calculations */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4">
                <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
                  <div className="text-xs text-[#A1A1AA] mb-1">
                    health factor
                  </div>
                  <div
                    className={cn(
                      "text-lg font-semibold font-mono",
                      getHealthFactorColor(
                        currentMetrics.healthFactor || Infinity,
                      ),
                    )}
                  >
                    {formatHealthFactor(currentMetrics.healthFactor)}
                  </div>
                </div>

                {repayAmountUSD > 0 && currentMetrics.totalDebtUSD > 0 && (
                  <div className="text-[#71717A]">→</div>
                )}

                {repayAmountUSD > 0 && currentMetrics.totalDebtUSD > 0 && (
                  <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
                    <div className="text-xs text-[#A1A1AA] mb-1">
                      new health factor
                    </div>
                    <div
                      className={cn(
                        "text-lg font-semibold font-mono",
                        getHealthFactorColor(newHealthFactor),
                      )}
                    >
                      {formatHealthFactor(newHealthFactor)}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-4">
                <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
                  <div className="text-xs text-[#A1A1AA] mb-1">current LTV</div>
                  <div
                    className={cn(
                      "text-lg font-semibold font-mono",
                      getLTVColorClass(
                        currentMetrics.currentLTV,
                        currentMetrics.liquidationThreshold,
                      ),
                    )}
                  >
                    {currentMetrics.currentLTV.toFixed(2)}%
                  </div>
                </div>

                {repayAmountUSD > 0 && currentMetrics.totalDebtUSD > 0 && (
                  <div className="text-[#71717A]">→</div>
                )}

                {repayAmountUSD > 0 && currentMetrics.totalDebtUSD > 0 && (
                  <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
                    <div className="text-xs text-[#A1A1AA] mb-1">new LTV</div>
                    <div
                      className={cn(
                        "text-lg font-semibold font-mono",
                        getLTVColorClass(
                          newLTV,
                          currentMetrics.liquidationThreshold,
                        ),
                      )}
                    >
                      {newLTV.toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Repayment Benefit Info */}
            {repayAmountUSD > 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Info className="h-4 w-4 text-green-500" />
                <div className="text-sm">
                  <div className="text-[#FAFAFA] font-medium">
                    debt reduction benefit
                  </div>
                  <div className="text-[#A1A1AA] text-xs">
                    repaying will improve your health factor and reduce interest
                    payments
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <div className="flex-1">
                <BlueButton
                  onClick={handleRepay}
                  disabled={!isFormValid}
                  className={cn(
                    "h-8 py-2",
                    !isFormValid ? "opacity-50 cursor-not-allowed" : "",
                  )}
                >
                  {isSubmitting ? "repaying..." : `repay`}
                </BlueButton>
              </div>

              <DialogClose asChild>
                <div className="flex-1">
                  <GrayButton className="h-8 py-2">cancel</GrayButton>
                </div>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default RepayModal;
