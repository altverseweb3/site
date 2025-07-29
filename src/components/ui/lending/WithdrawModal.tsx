"use client";

import Image from "next/image";
import { AlertCircle, ArrowRight, TrendingDown } from "lucide-react";
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
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { AaveTransactions } from "@/utils/aave/interact";
import { ethers } from "ethers";
import { toast } from "sonner";
import { useState, useEffect, FC, ReactNode, ChangeEvent } from "react";
import { chainNames, SupportedChainId } from "@/config/aave";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { getHealthFactorColor } from "@/utils/aave/utils";
import { formatBalance } from "@/utils/common";

// Health Factor Calculator Utility
const calculateNewHealthFactorForWithdraw = (
  currentTotalCollateralUSD: number,
  currentTotalDebtUSD: number,
  withdrawAmountUSD: number,
  liquidationThreshold: number,
  isCollateralAsset: boolean,
): number => {
  if (currentTotalDebtUSD === 0) {
    return 999; // No debt means very high health factor
  }

  // If withdrawing collateral, subtract from collateral value
  const newTotalCollateral = isCollateralAsset
    ? Math.max(0, currentTotalCollateralUSD - withdrawAmountUSD)
    : currentTotalCollateralUSD;

  const adjustedCollateral = newTotalCollateral * liquidationThreshold;
  return adjustedCollateral / currentTotalDebtUSD;
};

// Main Withdraw Modal Component
interface WithdrawModalProps {
  tokenSymbol?: string;
  tokenName?: string;
  tokenIcon?: string; // Token icon filename (e.g., "usdc.png")
  chainId?: number; // Chain ID for token image path
  suppliedBalance?: string; // Amount user has supplied
  suppliedBalanceUSD?: string; // USD value of supplied balance
  supplyAPY?: string;
  isCollateral?: boolean; // Whether this asset is used as collateral
  healthFactor?: string;
  tokenPrice?: number; // Current token price in USD
  liquidationThreshold?: number; // LTV for this asset (e.g., 0.85 = 85%)
  totalCollateralUSD?: number; // Current total collateral in USD
  totalDebtUSD?: number; // Current total debt in USD
  onWithdraw?: (amount: string) => Promise<boolean>;
  children: ReactNode; // The trigger element
  isLoading?: boolean; // Loading state from parent
  tokenAddress?: string; // Token contract address
  tokenDecimals?: number; // Token decimals
  aTokenAddress?: string; // aToken contract address
}

const WithdrawModal: FC<WithdrawModalProps> = ({
  tokenSymbol = "USDC",
  tokenIcon = "usdc.png",
  chainId = 1,
  suppliedBalance = "0",
  suppliedBalanceUSD = "0.00",
  supplyAPY = "3.53%",
  isCollateral = false,
  healthFactor = "1.24",
  tokenPrice = 1, // Default to $1 if not provided
  liquidationThreshold = 0.85, // Default 85% LTV
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  onWithdraw = async () => true,
  children,
  isLoading = false,
  tokenAddress = "", // Token contract address
  tokenDecimals = 18, // Token decimals
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  // Get wallet connection info
  const { evmNetwork, isEvmConnected } = useWalletConnection();

  const chainName = chainNames[chainId] || "ethereum";
  const fallbackIcon = tokenSymbol.charAt(0).toUpperCase();

  // Image path logic (same as other modals)
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
    } else {
      setWithdrawAmount("");
    }
  }, [isOpen, isMounted]);

  // Don't render on server to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  // Calculate USD value and health factor changes
  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const withdrawAmountUSD = withdrawAmountNum * tokenPrice;
  const currentHealthFactor = parseFloat(healthFactor) || 0;
  const suppliedBalanceNum = parseFloat(suppliedBalance) || 0;

  // Calculate new health factor if withdrawing collateral
  const newHealthFactor =
    isCollateral && totalDebtUSD > 0
      ? calculateNewHealthFactorForWithdraw(
          totalCollateralUSD,
          totalDebtUSD,
          withdrawAmountUSD,
          liquidationThreshold,
          isCollateral,
        )
      : currentHealthFactor;

  const healthFactorChange = newHealthFactor - currentHealthFactor;

  // Check if withdrawal would be dangerous
  const isDangerous =
    isCollateral &&
    newHealthFactor < 1.1 &&
    totalDebtUSD > 0 &&
    withdrawAmountNum > 0;
  const exceedsBalance = withdrawAmountNum > suppliedBalanceNum;

  // Validation
  const isAmountValid =
    withdrawAmountNum > 0 && withdrawAmountNum <= suppliedBalanceNum;
  const isFormValid =
    isAmountValid && !isLoading && !isSubmitting && !isDangerous;

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

      // Get signer from window.ethereum
      if (!window.ethereum) {
        throw new Error("MetaMask not found");
      }

      const provider = new ethers.BrowserProvider(
        window.ethereum as unknown as ethers.Eip1193Provider,
      );
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Show initial toast
      const toastId = toast.loading(
        `Withdrawing ${withdrawAmount} ${tokenSymbol}`,
        {
          description: "Processing withdrawal from Aave",
        },
      );

      // Call the Aave withdraw function
      const result = await AaveTransactions.withdrawAsset({
        tokenAddress,
        amount: withdrawAmount,
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId: currentChainId as SupportedChainId,
        signer,
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
              <div className="bg-blue-500 rounded-full p-1 flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {fallbackIcon}
                </span>
              </div>
            )}
            Withdraw {tokenSymbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Position Info */}
          <div className="p-4 bg-[#27272A] rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A1A1AA]">Supplied Balance</span>
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
                Withdraw Amount
              </label>
              <div className="flex items-center gap-2">
                <div className="text-xs text-[#A1A1AA]">
                  Available: {suppliedBalance} {tokenSymbol}
                </div>
                <button
                  onClick={handleMaxClick}
                  disabled={isLoading || isSubmitting}
                  className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-500 hover:text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                >
                  Max
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
                  Amount exceeds supplied balance
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

          {/* Health Factor Impact Warning */}
          {isDangerous && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div className="text-sm">
                <div className="text-red-500 font-medium">Risk Warning</div>
                <div className="text-[#A1A1AA] text-xs">
                  Withdrawing this amount would reduce your health factor below
                  1.1, putting you at risk of liquidation
                </div>
              </div>
            </div>
          )}

          {/* APY Loss Warning */}
          {withdrawAmountNum > 0 && (
            <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <div className="text-sm">
                <div className="text-[#FAFAFA] font-medium">
                  Interest Impact
                </div>
                <div className="text-[#A1A1AA] text-xs">
                  You will stop earning {supplyAPY} APY on the withdrawn amount
                </div>
              </div>
            </div>
          )}

          {/* Health Factor Display */}
          {totalDebtUSD > 0 && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Current Health Factor</span>
                <span className={getHealthFactorColor(currentHealthFactor)}>
                  {currentHealthFactor.toFixed(2)}
                </span>
              </div>

              {Math.abs(healthFactorChange) > 0.01 &&
                isCollateral &&
                withdrawAmountNum > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">New Health Factor</span>
                    <span className={getHealthFactorColor(newHealthFactor)}>
                      {newHealthFactor.toFixed(2)}
                      <span
                        className={
                          healthFactorChange < 0
                            ? "text-red-500"
                            : "text-green-500"
                        }
                      >
                        {" "}
                        ({healthFactorChange > 0 ? "+" : ""}
                        {healthFactorChange.toFixed(2)})
                      </span>
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* Withdraw Button */}
          <Button
            onClick={handleWithdraw}
            disabled={!isFormValid}
            className={cn(
              "w-full disabled:opacity-50",
              isDangerous
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-600 text-white hover:bg-orange-700",
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Processing...
              </div>
            ) : isLoading ? (
              "Loading..."
            ) : isDangerous ? (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Too Risky to Withdraw
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 mr-2" />
                Withdraw{" "}
                {withdrawAmountNum > 0
                  ? `${formatBalance(withdrawAmountNum, 4)} `
                  : ""}
                {tokenSymbol}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-[#71717A] text-center">
            By withdrawing, you will reduce your earning potential and may
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
