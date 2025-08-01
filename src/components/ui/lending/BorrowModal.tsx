"use client";

import { AlertCircle, ArrowRight, TrendingUp } from "lucide-react";
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
import { TokenImage } from "@/components/ui/TokenImage";
import { cn } from "@/lib/utils";
import { AaveTransactions } from "@/utils/aave/interact";
import { toast } from "sonner";
import { useState, useEffect, FC, ReactNode, ChangeEvent } from "react";
import { SupportedChainId } from "@/config/aave";
import type { Token } from "@/types/web3";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { getHealthFactorColor } from "@/utils/aave/utils";
import { formatBalance } from "@/utils/formatters";
import { getChainByChainId } from "@/config/chains";

// Health Factor Calculator for Borrowing
const calculateNewHealthFactorForBorrow = (
  currentTotalCollateralUSD: number,
  currentTotalDebtUSD: number,
  newBorrowAmountUSD: number,
  liquidationThreshold: number,
): number => {
  const newTotalDebt = currentTotalDebtUSD + newBorrowAmountUSD;

  if (newTotalDebt === 0) {
    return 999; // No debt means very high health factor
  }

  const adjustedCollateral = currentTotalCollateralUSD * liquidationThreshold;
  return adjustedCollateral / newTotalDebt;
};

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
  onBorrow?: (
    amount: string,
    rateMode: "variable" | "stable",
  ) => Promise<boolean>;
  children: ReactNode;
  isLoading?: boolean;
  tokenAddress?: string;
  tokenDecimals?: number;
}

const BorrowModal: FC<BorrowModalProps> = ({
  tokenSymbol = "USDC",
  tokenName,
  tokenIcon = "usdc.png",
  chainId = 1,
  availableToBorrow = "0",
  availableToBorrowUSD = "0.00",
  variableBorrowAPY = "5.50%",
  stableBorrowAPY = "7.20%",
  borrowingEnabled = true,
  isIsolationMode = false,
  healthFactor = "1.24",
  tokenPrice = 1,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  onBorrow = async () => true,
  children,
  isLoading = false,
  tokenAddress = "",
  tokenDecimals = 18,
}) => {
  const [borrowAmount, setBorrowAmount] = useState("");
  const [rateMode, setRateMode] = useState<"variable" | "stable">("variable");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Get wallet connection info
  const { evmNetwork, isEvmConnected } = useWalletConnection();
  const { getEvmSigner } = useReownWalletProviderAndSigner();

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
    }
  }, [isOpen, isMounted]);

  if (!isMounted) {
    return null;
  }

  // Calculate values
  const borrowAmountNum = parseFloat(borrowAmount) || 0;
  const borrowAmountUSD = borrowAmountNum * tokenPrice;
  const currentHealthFactor = parseFloat(healthFactor) || 0;
  const availableToBorrowNum = parseFloat(availableToBorrow) || 0;

  // Calculate new health factor
  const newHealthFactor =
    totalCollateralUSD > 0
      ? calculateNewHealthFactorForBorrow(
          totalCollateralUSD,
          totalDebtUSD,
          borrowAmountUSD,
          0.85, // Average liquidation threshold
        )
      : currentHealthFactor;

  const healthFactorChange = newHealthFactor - currentHealthFactor;

  // Check if borrow would be dangerous
  const isDangerous = newHealthFactor < 1.2 && borrowAmountNum > 0;
  const exceedsAvailable = borrowAmountNum > availableToBorrowNum;

  // Validation
  const isAmountValid =
    borrowAmountNum > 0 && borrowAmountNum <= availableToBorrowNum;
  const isFormValid =
    isAmountValid &&
    borrowingEnabled &&
    !isLoading &&
    !isSubmitting &&
    !isDangerous;

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
      const result = await AaveTransactions.borrowAsset({
        tokenAddress,
        amount: borrowAmount,
        rateMode: rateMode === "variable" ? 2 : 1, // Aave rate mode: 1 = stable, 2 = variable
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId: currentChainId as SupportedChainId,
        signer,
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
    setBorrowAmount(availableToBorrow);
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
            Borrow {tokenSymbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Available to borrow info */}
          <div className="p-4 bg-[#27272A] rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A1A1AA]">
                Available to Borrow
              </span>
              <div className="text-right">
                <div className="text-sm text-[#FAFAFA]">
                  {availableToBorrow} {tokenSymbol}
                </div>
                <div className="text-xs text-[#71717A]">
                  ${availableToBorrowUSD}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A1A1AA]">
                Current Health Factor
              </span>
              <span
                className={`text-sm ${getHealthFactorColor(currentHealthFactor)}`}
              >
                {currentHealthFactor.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-[#A1A1AA]">
                Borrow Amount
              </label>
              <div className="flex items-center gap-2">
                <div className="text-xs text-[#A1A1AA]">
                  Max: {availableToBorrow} {tokenSymbol}
                </div>
                <button
                  onClick={handleMaxClick}
                  disabled={isLoading || isSubmitting}
                  className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-500 hover:text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  Max
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
                  exceedsAvailable && "border-red-500",
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
            {exceedsAvailable && borrowAmount && (
              <div className="flex items-center gap-1 mt-2">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-red-500 text-xs">
                  Amount exceeds available to borrow
                </p>
              </div>
            )}
          </div>

          {/* Rate Mode Selection */}
          <div>
            <label className="text-sm font-medium text-[#A1A1AA] mb-3 block">
              Interest Rate
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
                <div className="text-xs">{variableBorrowAPY}</div>
              </button>
              <button
                onClick={() => setRateMode("stable")}
                className={cn(
                  "p-3 rounded-lg border text-left transition-colors",
                  rateMode === "stable"
                    ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                    : "bg-[#27272A] border-[#3F3F46] text-[#A1A1AA] hover:border-blue-500/30",
                )}
              >
                <div className="font-medium text-sm">Stable</div>
                <div className="text-xs">{stableBorrowAPY}</div>
              </button>
            </div>
          </div>

          {/* Health Factor Impact Warning */}
          {isDangerous && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div className="text-sm">
                <div className="text-red-500 font-medium">
                  High Risk Warning
                </div>
                <div className="text-[#A1A1AA] text-xs">
                  Borrowing this amount would reduce your health factor below
                  1.2, putting you at high risk of liquidation
                </div>
              </div>
            </div>
          )}

          {/* Isolation Mode Warning */}
          {isIsolationMode && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <div className="text-sm">
                <div className="text-[#FAFAFA] font-medium">Isolation Mode</div>
                <div className="text-[#A1A1AA] text-xs">
                  You can only borrow stablecoins in isolation mode
                </div>
              </div>
            </div>
          )}

          {/* Health Factor Display */}
          {borrowAmountNum > 0 && Math.abs(healthFactorChange) > 0.01 && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">New Health Factor</span>
                <span className={getHealthFactorColor(newHealthFactor)}>
                  {newHealthFactor.toFixed(2)}
                  <span
                    className={
                      healthFactorChange < 0 ? "text-red-500" : "text-green-500"
                    }
                  >
                    {" "}
                    ({healthFactorChange > 0 ? "+" : ""}
                    {healthFactorChange.toFixed(2)})
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Borrow Button */}
          <Button
            onClick={handleBorrow}
            disabled={!isFormValid}
            className={cn(
              "w-full disabled:opacity-50",
              isDangerous
                ? "bg-red-600 hover:bg-red-700"
                : "bg-red-600 text-white hover:bg-red-700",
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Processing...
              </div>
            ) : isLoading ? (
              "Loading..."
            ) : !borrowingEnabled ? (
              "Borrowing Disabled"
            ) : isDangerous ? (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Too Risky to Borrow
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Borrow{" "}
                {borrowAmountNum > 0
                  ? `${formatBalance(borrowAmountNum, 4)} `
                  : ""}
                {tokenSymbol}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-[#71717A] text-center">
            By borrowing, you will pay interest at the {rateMode} rate. Ensure
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
