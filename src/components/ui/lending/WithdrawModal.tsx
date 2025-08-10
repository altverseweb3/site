"use client";

import Image from "next/image";
import { AlertCircle, Info } from "lucide-react";
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
import { toast } from "sonner";
import { useState, useEffect, FC, ReactNode, ChangeEvent } from "react";
import { getChainName, SupportedChainId } from "@/config/aave";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { getHealthFactorColor } from "@/utils/aave/utils";
import { UserPosition, UserBorrowPosition } from "@/types/aave";
import {
  validateWithdrawTransaction,
  type PositionData,
  type AssetData,
} from "@/utils/aave/transactionValidation";
import { calculateUserMetrics } from "@/utils/aave/metricsCalculations";

// Main Withdraw Modal Component
interface WithdrawModalProps {
  tokenSymbol?: string;
  tokenName?: string;
  tokenIcon?: string;
  chainId?: number;
  suppliedBalance?: string;
  suppliedBalanceUSD?: string;
  supplyAPY?: string;
  isCollateral?: boolean;
  tokenPrice?: number;
  liquidationThreshold?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  onWithdraw?: (amount: string) => Promise<boolean>;
  children: ReactNode;
  isLoading?: boolean;
  tokenAddress?: string;
  tokenDecimals?: number;
  aTokenAddress?: string;
  userSupplyPositions?: UserPosition[];
  userBorrowPositions?: UserBorrowPosition[];
  oraclePrices?: Record<string, number>;
}

const WithdrawModal: FC<WithdrawModalProps> = ({
  tokenSymbol = "USDC",
  tokenIcon = "usdc.png",
  chainId = 1,
  suppliedBalance = "0",
  suppliedBalanceUSD = "0.00",
  supplyAPY = "3.53%",
  isCollateral = false,
  tokenPrice = 1,
  liquidationThreshold = 0.85,
  onWithdraw = async () => true,
  children,
  isLoading = false,
  tokenAddress = "",
  tokenDecimals = 18,
  userSupplyPositions = [],
  userBorrowPositions = [],
  oraclePrices = {},
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [acceptHighRisk, setAcceptHighRisk] = useState(false);

  const { evmNetwork, isEvmConnected } = useWalletConnection();
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const { withdraw } = useAaveInteract();

  const chainName = getChainName(chainId);
  const fallbackIcon = tokenSymbol.charAt(0).toUpperCase();

  const getImagePath = () => {
    if (!tokenIcon || tokenIcon === "unknown.png" || hasImageError) {
      return null;
    }
    return `/tokens/${chainName}/pngs/${tokenIcon}`;
  };

  const imagePath = getImagePath();

  // Handle client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isMounted) return;

    if (isOpen) {
      setWithdrawAmount("");
      setAcceptHighRisk(false);
    } else {
      setWithdrawAmount("");
    }
  }, [isOpen, isMounted]);

  // Don't render on server to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  // Calculate USD value and validation
  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const withdrawAmountUSD = withdrawAmountNum * tokenPrice;
  const suppliedBalanceNum = parseFloat(suppliedBalance) || 0;

  // Calculate USD positions EXACTLY like metrics header does
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

  const userBorrowPositionsUSD = userBorrowPositions.map((position) => {
    const formattedTotalDebt = parseFloat(position.formattedTotalDebt || "0");
    const oraclePrice =
      oraclePrices[position.asset.asset.address.toLowerCase()];
    return {
      ...position,
      totalDebtUSD:
        oraclePrice !== undefined
          ? (formattedTotalDebt * oraclePrice).toString()
          : "0.00",
    };
  });

  // Calculate current metrics using real user data
  const currentMetrics = calculateUserMetrics(
    userSupplyPositionsUSD,
    userBorrowPositionsUSD,
  );

  // Prepare validation data
  const positionData: PositionData = {
    totalCollateralUSD: currentMetrics.totalCollateralUSD,
    totalDebtUSD: currentMetrics.totalDebtUSD,
    healthFactor: currentMetrics.healthFactor || Infinity,
  };

  const assetData: AssetData = {
    price: tokenPrice,
    liquidationThreshold: liquidationThreshold,
    isCollateral: isCollateral,
  };

  // Validate transaction
  const validation = validateWithdrawTransaction(
    positionData,
    assetData,
    withdrawAmountUSD,
  );

  // Calculate new health factor and LTV - only if withdrawing collateral
  let newHealthFactor = currentMetrics.healthFactor || Infinity;
  let newLTV = currentMetrics.currentLTV;
  let isHighRiskTransaction = false;

  if (isCollateral && currentMetrics.totalDebtUSD > 0) {
    // Only calculate impact if this is a collateral asset and user has debt
    const newTotalCollateral = Math.max(
      0,
      currentMetrics.totalCollateralUSD - withdrawAmountUSD,
    );
    const newWeightedCollateral = newTotalCollateral * liquidationThreshold;
    newHealthFactor = newWeightedCollateral / currentMetrics.totalDebtUSD;
    newLTV =
      newTotalCollateral > 0
        ? (currentMetrics.totalDebtUSD / newTotalCollateral) * 100
        : currentMetrics.totalDebtUSD > 0
          ? 100
          : 0;
    // Allow risk acceptance for any transaction that would result in HF < 1.2 (including liquidation level)
    isHighRiskTransaction = newHealthFactor < 1.2;
  }

  // Check various validation conditions
  const exceedsBalance = withdrawAmountNum > suppliedBalanceNum;

  // Enhanced form validation
  const isAmountValid =
    withdrawAmountNum > 0 && withdrawAmountNum <= suppliedBalanceNum;
  const isFormValid =
    isAmountValid &&
    !isLoading &&
    !isSubmitting &&
    (!isHighRiskTransaction || acceptHighRisk);

  const handleWithdraw = async () => {
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
      // Get current chain ID
      const currentChainId = evmNetwork?.chainId
        ? typeof evmNetwork.chainId === "string"
          ? parseInt(evmNetwork.chainId, 10)
          : evmNetwork.chainId
        : 1; // Default to Ethereum mainnet

      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();

      // Show initial toast
      const toastId = toast.loading(
        `Withdrawing ${withdrawAmount} ${tokenSymbol}`,
        {
          description: "Processing withdrawal from Aave",
        },
      );

      // Call the Aave withdraw function
      const result = await withdraw({
        tokenAddress,
        amount: withdrawAmount,
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId: currentChainId as SupportedChainId,
      });

      if (result.success) {
        toast.success(
          `Successfully withdrew ${withdrawAmount} ${tokenSymbol}`,
          {
            id: toastId,
            description: `Transaction: ${result.txHash?.slice(0, 10)}...`,
          },
        );

        // Reset form and close modal
        setIsOpen(false);
        setWithdrawAmount("");

        // Call the optional callback
        if (onWithdraw) {
          await onWithdraw(withdrawAmount);
        }
      } else {
        toast.error("Withdrawal failed", {
          id: toastId,
          description: result.error || "Transaction failed",
        });
      }
    } catch (error: unknown) {
      toast.error("Withdrawal failed", {
        description: (error as Error).message || "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaxClick = () => {
    setWithdrawAmount(suppliedBalance);
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only valid number input
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setWithdrawAmount(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[384px] bg-[#18181B] border-[#27272A]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[#FAFAFA]">
            {imagePath ? (
              <Image
                src={imagePath}
                alt={tokenSymbol}
                width={24}
                height={24}
                className="rounded-full"
                onError={() => setHasImageError(true)}
              />
            ) : (
              <div className="bg-sky-500 rounded-full p-1 flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {fallbackIcon}
                </span>
              </div>
            )}
            withdraw {tokenSymbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Position Info */}
          <div className="p-4 bg-[#27272A] rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A1A1AA]">supplied balance</span>
              <div className="text-right">
                <div className="text-sm text-[#FAFAFA]">
                  {suppliedBalance} {tokenSymbol}
                </div>
                <div className="text-xs text-[#71717A]">
                  ${suppliedBalanceUSD}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A1A1AA]">Supply APY</span>
              <span className="text-sm text-green-500">{supplyAPY}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A1A1AA]">Used as Collateral</span>
              <span
                className={isCollateral ? "text-green-500" : "text-[#A1A1AA]"}
              >
                {isCollateral ? "Yes" : "No"}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-[#A1A1AA]">
                withdraw amount
              </label>
              <div className="flex items-center gap-2">
                <div className="text-xs text-[#A1A1AA]">
                  available: {suppliedBalance} {tokenSymbol}
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
                value={withdrawAmount}
                onChange={handleAmountChange}
                disabled={isLoading || isSubmitting}
                className={cn(
                  "pr-16 bg-[#27272A] border-[#3F3F46] text-[#FAFAFA] placeholder:text-[#71717A] text-lg",
                  !isAmountValid && withdrawAmount && "border-red-500",
                  exceedsBalance && "border-red-500",
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="text-sm text-[#A1A1AA]">{tokenSymbol}</span>
              </div>
            </div>

            {/* USD Value */}
            <div className="mt-2 text-xs text-[#71717A]">
              ${withdrawAmountUSD.toFixed(2)} USD
            </div>

            {/* Validation errors */}
            {exceedsBalance && withdrawAmount && (
              <div className="flex items-center gap-1 mt-2">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-red-500 text-xs">
                  amount exceeds supplied balance
                </p>
              </div>
            )}

            {!isAmountValid && withdrawAmount && !exceedsBalance && (
              <div className="flex items-center gap-1 mt-2">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-red-500 text-xs">Enter a valid amount</p>
              </div>
            )}
          </div>

          {/* APY Loss Warning */}
          {withdrawAmountNum > 0 && (
            <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <Info className="h-4 w-4 text-orange-500" />
              <div className="text-sm">
                <div className="text-[#FAFAFA] font-medium">
                  interest impact
                </div>
                <div className="text-[#A1A1AA] text-xs">
                  you will stop earning {supplyAPY} APY on the withdrawn amount
                </div>
              </div>
            </div>
          )}

          {/* Health Factor Display - Same style as BorrowModal */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
                <div className="text-xs text-[#A1A1AA] mb-1">health factor</div>
                <div
                  className={cn(
                    "text-lg font-semibold font-mono",
                    getHealthFactorColor(
                      currentMetrics.healthFactor || Infinity,
                    ),
                  )}
                >
                  {currentMetrics.healthFactor === null ||
                  currentMetrics.healthFactor === Infinity
                    ? "∞"
                    : currentMetrics.healthFactor.toFixed(2)}
                </div>
              </div>

              {withdrawAmountUSD > 0 &&
                isCollateral &&
                currentMetrics.totalDebtUSD > 0 && (
                  <div className="text-[#71717A]">→</div>
                )}

              {withdrawAmountUSD > 0 &&
                isCollateral &&
                currentMetrics.totalDebtUSD > 0 && (
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
                      {newHealthFactor === Infinity
                        ? "∞"
                        : newHealthFactor.toFixed(2)}
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
                    currentMetrics.currentLTV <
                      currentMetrics.liquidationThreshold * 0.7
                      ? "text-green-500"
                      : currentMetrics.currentLTV <
                          currentMetrics.liquidationThreshold * 0.9
                        ? "text-amber-500"
                        : "text-red-500",
                  )}
                >
                  {currentMetrics.currentLTV.toFixed(2)}%
                </div>
              </div>

              {withdrawAmountUSD > 0 &&
                isCollateral &&
                currentMetrics.totalDebtUSD > 0 && (
                  <div className="text-[#71717A]">→</div>
                )}

              {withdrawAmountUSD > 0 &&
                isCollateral &&
                currentMetrics.totalDebtUSD > 0 && (
                  <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
                    <div className="text-xs text-[#A1A1AA] mb-1">new LTV</div>
                    <div
                      className={cn(
                        "text-lg font-semibold font-mono",
                        newLTV < currentMetrics.liquidationThreshold * 0.7
                          ? "text-green-500"
                          : newLTV < currentMetrics.liquidationThreshold * 0.9
                            ? "text-amber-500"
                            : "text-red-500",
                      )}
                    >
                      {newLTV.toFixed(2)}%
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Show validation warning if exists */}
          {isHighRiskTransaction && (
            <div
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                newHealthFactor < 1.1
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-yellow-500/10 border border-yellow-500/20",
              )}
            >
              <AlertCircle
                className={cn(
                  "h-4 w-4",
                  newHealthFactor < 1.1 ? "text-red-500" : "text-yellow-500",
                )}
              />
              <div className="text-sm">
                <div
                  className={cn(
                    "font-medium",
                    newHealthFactor < 1.1 ? "text-red-500" : "text-yellow-500",
                  )}
                >
                  {newHealthFactor < 1.1
                    ? "liquidation risk"
                    : "high risk transaction"}
                </div>
                <div className="text-[#A1A1AA] text-xs">
                  This withdrawal will set your health factor to{" "}
                  {newHealthFactor.toFixed(2)}
                  {newHealthFactor < 1.0 && " - immediate liquidation risk"}
                </div>
                {
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="acceptHighRiskWithdraw"
                      checked={acceptHighRisk}
                      onChange={(e) => setAcceptHighRisk(e.target.checked)}
                      className="w-3 h-3 text-red-500 bg-[#27272A] border border-red-500/50 rounded-sm focus:ring-red-500/30 focus:ring-1 accent-red-500"
                    />
                    <label
                      htmlFor="acceptHighRiskWithdraw"
                      className="text-xs text-[#A1A1AA] cursor-pointer"
                    >
                      {newHealthFactor < 1.1
                        ? "I understand the liquidation risk and accept it"
                        : "I accept the high risk of this withdrawal"}
                    </label>
                  </div>
                }
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <div className="flex-1">
              <BlueButton
                onClick={handleWithdraw}
                disabled={!isFormValid}
                className={cn(
                  "h-8 py-2",
                  !isFormValid ? "opacity-50 cursor-not-allowed" : "",
                  validation.riskLevel === "liquidation" ||
                    validation.riskLevel === "high"
                    ? "border-red-500/25 bg-red-500/10 hover:bg-red-500/20"
                    : "",
                )}
              >
                <span
                  className={cn(
                    validation.riskLevel === "liquidation" ||
                      validation.riskLevel === "high"
                      ? "text-red-500"
                      : "",
                  )}
                >
                  {isSubmitting
                    ? "withdrawing..."
                    : isHighRiskTransaction && !acceptHighRisk
                      ? "high risk - blocked"
                      : isHighRiskTransaction && acceptHighRisk
                        ? "high risk withdraw"
                        : "withdraw"}
                </span>
              </BlueButton>
            </div>

            <DialogClose asChild>
              <div className="flex-1">
                <GrayButton className="h-8 py-2">cancel</GrayButton>
              </div>
            </DialogClose>
          </div>

          <p className="text-xs text-[#71717A] text-center">
            by withdrawing, you will reduce your earning potential and may
            affect your borrowing capacity.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export {
  WithdrawModal,
  Dialog as WithdrawDialog,
  DialogTrigger as WithdrawDialogTrigger,
  DialogPortal as WithdrawDialogPortal,
  DialogOverlay as WithdrawDialogOverlay,
  DialogContent as WithdrawDialogContent,
  DialogHeader as WithdrawDialogHeader,
  DialogTitle as WithdrawDialogTitle,
  DialogClose as WithdrawDialogClose,
};
