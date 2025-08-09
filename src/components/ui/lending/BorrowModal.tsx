"use client";

import { AlertCircle } from "lucide-react";
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
  AmberButton,
  GrayButton,
} from "@/components/ui/lending/SupplyButtonComponents";
import { Input } from "@/components/ui/Input";
import { TokenImage } from "@/components/ui/TokenImage";
import { cn } from "@/lib/utils";
import { useAaveInteract } from "@/utils/aave/interact";
import { RateMode } from "@/types/aave";
import { toast } from "sonner";
import { useState, useEffect, FC, ReactNode, ChangeEvent } from "react";
import { SupportedChainId } from "@/config/aave";
import type { Token } from "@/types/web3";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import {
  calculateUserBorrowPositionsUSD,
  getHealthFactorColor,
} from "@/utils/aave/utils";
import { getChainByChainId } from "@/config/chains";
import { SimpleHealthIndicator } from "@/components/ui/lending/SimpleHealthIndicator";
import { UserPosition, UserBorrowPosition } from "@/types/aave";
import {
  calculateBorrowingMetrics,
  calculateNewHealthFactorAfterBorrow,
  isHighRiskTransaction as isHighRiskTransactionUtil,
} from "@/utils/aave/metricsCalculations";
import {
  validateBorrowTransaction,
  type PositionData,
  type AssetData,
} from "@/utils/aave/transactionValidation";
import { formatCurrency } from "@/utils/formatters";

// Main Borrow Modal Component
interface BorrowModalProps {
  tokenSymbol?: string;
  tokenName?: string;
  tokenIcon?: string;
  chainId?: number;
  availableToBorrow?: string; // Amount user can borrow
  availableToBorrowUSD?: string; // USD value of borrowable amount
  variableBorrowAPY?: string;
  stableBorrowAPY?: string;
  borrowingEnabled?: boolean;
  isIsolationMode?: boolean;
  healthFactor?: string;
  tokenPrice?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  currentLTV?: number; // Current loan-to-value ratio
  liquidationThreshold?: number; // Liquidation threshold percentage
  onBorrow?: (
    amount: string,
    rateMode: "variable" | "stable",
  ) => Promise<boolean>;
  children: ReactNode;
  isLoading?: boolean;
  tokenAddress?: string;
  tokenDecimals?: number;
  userSupplyPositions?: UserPosition[];
  userBorrowPositions?: UserBorrowPosition[];
  oraclePrices?: Record<string, number>;
}

const BorrowModal: FC<BorrowModalProps> = ({
  tokenSymbol = "USDC",
  tokenName,
  tokenIcon = "usdc.png",
  chainId = 1,
  availableToBorrowUSD = "0.00",
  variableBorrowAPY = "5.50%",
  stableBorrowAPY = "7.20%",
  borrowingEnabled = true,
  isIsolationMode = false,
  healthFactor = "1.24",
  tokenPrice = 1,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  liquidationThreshold = 85,
  onBorrow = async () => true,
  children,
  isLoading = false,
  tokenAddress = "",
  tokenDecimals = 18,
  userSupplyPositions = [],
  userBorrowPositions = [],
  oraclePrices = {},
}) => {
  const [borrowAmount, setBorrowAmount] = useState("");
  const [rateMode, setRateMode] = useState<"variable" | "stable">("variable");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [acceptHighRisk, setAcceptHighRisk] = useState(false);

  // Get wallet connection info
  const { evmNetwork, isEvmConnected } = useWalletConnection();
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const { borrow } = useAaveInteract();

  // Create Token and Chain objects for TokenImage component
  const token: Token = {
    id: tokenAddress || `${tokenSymbol}-${chainId}`,
    name: tokenName || tokenSymbol,
    ticker: tokenSymbol,
    icon: tokenIcon || "unknown.png",
    address: tokenAddress || "",
    decimals: tokenDecimals,
    chainId: chainId,
    stringChainId: chainId.toString(),
  };

  const chain = getChainByChainId(chainId);

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isMounted) return;

    if (isOpen) {
      setBorrowAmount("");
      setRateMode("variable");
      setAcceptHighRisk(false);
    }
  }, [isOpen, isMounted]);

  if (!isMounted) {
    return null;
  }

  // Calculate values
  const borrowAmountNum = parseFloat(borrowAmount) || 0;
  const borrowAmountUSD = borrowAmountNum * tokenPrice;
  const currentHealthFactor = parseFloat(healthFactor) || 0;

  const {
    currentMetrics,
    maxBorrowUSD,
    maxBorrowAmount,
    isStableRateAvailable,
  } = calculateBorrowingMetrics(
    userSupplyPositions,
    userBorrowPositions,
    tokenPrice,
    stableBorrowAPY,
    oraclePrices,
  );

  // Calculate USD positions for SimpleHealthIndicator
  const userSupplyPositionsUSD = userSupplyPositions.map((position) => {
    const suppliedBalance = parseFloat(position.suppliedBalance || "0");
    const oraclePrice =
      oraclePrices[position.asset.asset.address.toLowerCase()];
    return {
      ...position,
      suppliedBalanceUSD:
        oraclePrice !== undefined
          ? (suppliedBalance * oraclePrice).toString()
          : "0.00",
    };
  });

  const userBorrowPositionsUSD = calculateUserBorrowPositionsUSD(
    userBorrowPositions,
    oraclePrices,
  );
<<<<<<< HEAD
=======
  const calculateMaxBorrowUSD = () => {
    if (!currentMetrics) return 0;

    const { totalCollateralUSD, totalDebtUSD } = currentMetrics;
    const liquidationThresholdDecimal =
      currentMetrics.liquidationThreshold > 1
        ? currentMetrics.liquidationThreshold / 100
        : currentMetrics.liquidationThreshold;

    // HF = (collateral * liquidationThreshold) / totalDebt
    // Allow borrowing down to exactly 1.12 health factor (not below)
    // 1.12 = (collateral * liquidationThreshold) / (currentDebt + newBorrow)
    // newBorrow = (collateral * liquidationThreshold) / 1.12 - currentDebt
    const weightedCollateral = totalCollateralUSD * liquidationThresholdDecimal;
    const maxTotalDebt = weightedCollateral / 1.12; // Allow exactly 1.12 HF
    const maxNewBorrowUSD = Math.max(0, maxTotalDebt - totalDebtUSD);

    return maxNewBorrowUSD;
  };

  const maxBorrowUSD = calculateMaxBorrowUSD();
  const maxBorrowAmount =
    tokenPrice > 0 ? (maxBorrowUSD / tokenPrice).toFixed(4) : "0";
  const isStableRateAvailable = parseFloat(stableBorrowAPY) > 0;
>>>>>>> 0b1fc4e (chore: fix linting apply modal changes)

  // Prepare validation data
  const positionData: PositionData = {
    totalCollateralUSD,
    totalDebtUSD,
    healthFactor: currentHealthFactor,
  };

  const assetData: AssetData = {
    price: tokenPrice,
    liquidationThreshold: liquidationThreshold / 100, // Use actual liquidation threshold from props
    isCollateral: false, // Borrowed assets don't affect collateral
  };

  // Calculate available amounts
  const availableToBorrowUSDNum = parseFloat(availableToBorrowUSD) || 0;

  // Validate transaction
  const validation = validateBorrowTransaction(
    positionData,
    assetData,
    borrowAmountUSD,
    availableToBorrowUSDNum,
  );

  // Check various validation conditions
  const exceedsMaxSafe = borrowAmountNum > parseFloat(maxBorrowAmount);
  const isAmountValid =
    borrowAmountNum > 0 && borrowAmountNum <= parseFloat(maxBorrowAmount);

  // Calculate new health factor to check if this is high risk
  const newHealthFactor = currentMetrics
    ? calculateNewHealthFactorAfterBorrow(
      currentMetrics.totalCollateralUSD,
      currentMetrics.totalDebtUSD,
      borrowAmountUSD,
      currentMetrics.liquidationThreshold,
    )
    : Infinity;
  const isHighRiskTransaction = isHighRiskTransactionUtil(newHealthFactor);

  // Enhanced form validation - require risk acceptance for high risk transactions
  const isFormValid =
    isAmountValid &&
    borrowingEnabled &&
    !isLoading &&
    !isSubmitting &&
    (validation.isValid || (isHighRiskTransaction && acceptHighRisk)) &&
    (!isHighRiskTransaction || acceptHighRisk);

  const handleBorrow = async () => {
    if (!isFormValid) return;

    // Check wallet connection
    if (!isEvmConnected) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to continue",
      });
      return;
    }

    // Check if we have required token info
    if (
      !tokenAddress ||
      tokenAddress === "" ||
      tokenAddress === "0x0000000000000000000000000000000000000000"
    ) {
      toast.error("Token information missing", {
        description: `Unable to find token contract address for ${tokenSymbol}`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const currentChainId = evmNetwork?.chainId
        ? typeof evmNetwork.chainId === "string"
          ? parseInt(evmNetwork.chainId, 10)
          : evmNetwork.chainId
        : 1;

      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();

      // Show initial toast
      const toastId = toast.loading(
        `Borrowing ${borrowAmount} ${tokenSymbol}`,
        {
          description: `Borrowing at ${rateMode} rate`,
        },
      );

      // Call the Aave borrow function
      const result = await borrow({
        tokenAddress,
        amount: borrowAmount,
        rateMode: rateMode === "variable" ? RateMode.Variable : RateMode.Stable,
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId: currentChainId as SupportedChainId,
      });

      if (result.success) {
        toast.success(`Successfully borrowed ${borrowAmount} ${tokenSymbol}`, {
          id: toastId,
          description: `Transaction: ${result.txHash?.slice(0, 10)}...`,
        });

        // Reset form and close modal
        setIsOpen(false);
        setBorrowAmount("");

        // Call the optional callback
        if (onBorrow) {
          await onBorrow(borrowAmount, rateMode);
        }
      } else {
        toast.error("Borrow failed", {
          id: toastId,
          description: result.error || "Transaction failed",
        });
      }
    } catch (error: unknown) {
      toast.error("Borrow failed", {
        description: (error as Error).message || "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaxClick = () => {
    // Use the max safe amount (HF = 1.12)
    setBorrowAmount(maxBorrowAmount);
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setBorrowAmount(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[384px] bg-[#18181B] border-[#27272A]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[#FAFAFA]">
            <div className="rounded-full overflow-hidden">
              <TokenImage token={token} chain={chain} size="sm" />
            </div>
            borrow {tokenSymbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Available to borrow info */}
          <div className="p-4 bg-[#27272A] rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A1A1AA]">
                available to borrow
              </span>
              <div className="text-right">
                <div className="text-sm text-[#FAFAFA]">
                  {maxBorrowAmount} {tokenSymbol}
                </div>
                <div className="text-xs text-[#71717A]">
                  {formatCurrency(maxBorrowUSD)}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A1A1AA]">
                current health factor
              </span>
              <span
                className={`text-sm ${getHealthFactorColor(currentMetrics?.healthFactor || Infinity)}`}
              >
                {!currentMetrics ||
                  currentMetrics.healthFactor === null ||
                  currentMetrics.healthFactor === Infinity
                  ? "∞"
                  : currentMetrics.healthFactor.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-[#A1A1AA]">
                borrow amount
              </label>
              <div className="flex items-center gap-2">
                <div className="text-xs text-[#A1A1AA]">
                  max: {maxBorrowAmount} {tokenSymbol}
                </div>
                <button
                  onClick={handleMaxClick}
                  disabled={isLoading || isSubmitting}
                  className="text-xs px-2 py-1 rounded bg-sky-500/20 text-sky-500 hover:text-sky-400 hover:bg-sky-500/30 transition-colors disabled:opacity-50"
                >
                  max
                </button>
              </div>
            </div>

            <div className="relative">
              <Input
                type="text"
                placeholder="0.0"
                value={borrowAmount}
                onChange={handleAmountChange}
                disabled={isLoading || isSubmitting}
                className={cn(
                  "pr-16 bg-[#27272A] border-[#3F3F46] text-[#FAFAFA] placeholder:text-[#71717A] text-lg",
                  !isAmountValid && borrowAmount && "border-red-500",
                  exceedsMaxSafe && "border-red-500",
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="text-sm text-[#A1A1AA]">{tokenSymbol}</span>
              </div>
            </div>

            {/* USD Value */}
            <div className="mt-2 text-xs text-[#71717A]">
              ${borrowAmountUSD.toFixed(2)} USD
            </div>

            {/* Validation errors */}
            {exceedsMaxSafe && borrowAmount && (
              <div className="flex items-center gap-1 mt-2">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-red-500 text-xs">
                  Amount exceeds maximum safe borrowing limit
                </p>
              </div>
            )}
          </div>

          {/* Rate Mode Selection */}
          <div>
            <label className="text-sm font-medium text-[#A1A1AA] mb-3 block">
              interest rate
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRateMode("variable")}
                className={cn(
                  "p-3 rounded-lg border text-left transition-colors",
                  rateMode === "variable"
                    ? "bg-orange-500/10 border-orange-500/50 text-orange-400"
                    : "bg-[#27272A] border-[#3F3F46] text-[#A1A1AA] hover:border-orange-500/30",
                )}
              >
                <div className="font-medium text-sm">Variable</div>
                <div className="text-xs">{variableBorrowAPY}%</div>
              </button>
              <button
                onClick={() => setRateMode("stable")}
                disabled={!isStableRateAvailable}
                className={cn(
                  "p-3 rounded-lg border text-left transition-colors",
                  !isStableRateAvailable && "opacity-50 cursor-not-allowed",
                  rateMode === "stable" && isStableRateAvailable
                    ? "bg-sky-500/10 border-sky-500/50 text-sky-400"
                    : "bg-[#27272A] border-[#3F3F46] text-[#A1A1AA] hover:border-sky-500/30",
                )}
              >
                <div className="font-medium text-sm">
                  Stable {!isStableRateAvailable && "(Unavailable)"}
                </div>
                <div className="text-xs">
                  {isStableRateAvailable ? `${stableBorrowAPY}%` : "0.00%"}
                </div>
              </button>
            </div>
          </div>

          {/* Enhanced health factor display */}
          <SimpleHealthIndicator
            userSupplyPositionsUSD={userSupplyPositionsUSD}
            userBorrowPositionsUSD={userBorrowPositionsUSD}
            transactionAmountUSD={borrowAmountUSD}
            transactionType="borrow"
            transactionAssetAddress={tokenAddress}
          />

          {/* Show validation warning if exists */}
          {(validation.warningMessage || isHighRiskTransaction) && (
            <div
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                validation.riskLevel === "liquidation"
                  ? "bg-red-500/10 border border-red-500/20"
                  : validation.riskLevel === "high"
                    ? "bg-red-500/10 border border-red-500/20"
                    : "bg-yellow-500/10 border border-yellow-500/20",
              )}
            >
              <AlertCircle
                className={cn(
                  "h-4 w-4",
                  validation.riskLevel === "liquidation" ||
                    validation.riskLevel === "high"
                    ? "text-red-500"
                    : "text-yellow-500",
                )}
              />
              <div className="text-sm">
                <div
                  className={cn(
                    "font-medium",
                    validation.riskLevel === "liquidation" ||
                      validation.riskLevel === "high"
                      ? "text-red-500"
                      : "text-yellow-500",
                  )}
                >
                  {validation.riskLevel === "liquidation"
                    ? "liquidation risk"
                    : validation.riskLevel === "high" || isHighRiskTransaction
                      ? "high risk transaction"
                      : "moderate risk"}
                </div>
                <div className="text-[#A1A1AA] text-xs">
                  {isHighRiskTransaction
                    ? `This transaction will set your health factor to ${newHealthFactor.toFixed(2)}`
                    : validation.warningMessage}
                </div>
                {isHighRiskTransaction && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="acceptHighRisk"
                      checked={acceptHighRisk}
                      onChange={(e) => setAcceptHighRisk(e.target.checked)}
                      className="w-3 h-3 text-red-500 bg-[#27272A] border border-red-500/50 rounded-sm focus:ring-red-500/30 focus:ring-1 accent-red-500"
                    />
                    <label
                      htmlFor="acceptHighRisk"
                      className="text-xs text-[#A1A1AA] cursor-pointer"
                    >
                      I accept the high risk of this transaction
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Isolation Mode Warning */}
          {isIsolationMode && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <div className="text-sm">
                <div className="text-[#FAFAFA] font-medium">isolation mode</div>
                <div className="text-[#A1A1AA] text-xs">
                  you can only borrow stablecoins in isolation mode
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <div className="flex-1">
              <AmberButton
                onClick={handleBorrow}
                disabled={!isFormValid}
                className={cn(
                  "h-8 py-2",
                  !isFormValid ? "opacity-50 cursor-not-allowed" : "",
                  validation.riskLevel === "liquidation" ||
                    validation.riskLevel === "high"
                    ? "border-red-500/25 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400"
                    : "",
                )}
              >
                {isSubmitting
                  ? "borrowing..."
                  : !borrowingEnabled
                    ? "borrowing disabled"
                    : !validation.isValid &&
                      validation.riskLevel === "liquidation"
                      ? "too risky to borrow"
                      : !validation.isValid && validation.riskLevel === "high"
                        ? "high risk - blocked"
                        : isHighRiskTransaction && !acceptHighRisk
                          ? "accept risk to continue"
                          : isHighRiskTransaction && acceptHighRisk
                            ? "high risk borrow"
                            : exceedsMaxSafe
                              ? "exceeds max safe"
                              : "borrow"}
              </AmberButton>
            </div>

            <DialogClose asChild>
              <div className="flex-1">
                <GrayButton className="h-8 py-2">cancel</GrayButton>
              </div>
            </DialogClose>
          </div>

          <p className="text-xs text-[#71717A] text-center">
            by borrowing, you will pay interest at the {rateMode} rate. ensure
            you can repay to avoid liquidation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export {
  BorrowModal,
  Dialog as BorrowDialog,
  DialogTrigger as BorrowDialogTrigger,
  DialogPortal as BorrowDialogPortal,
  DialogOverlay as BorrowDialogOverlay,
  DialogContent as BorrowDialogContent,
  DialogHeader as BorrowDialogHeader,
  DialogTitle as BorrowDialogTitle,
  DialogClose as BorrowDialogClose,
};