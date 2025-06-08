"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, AlertCircle, Info, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AaveTransactions, SupportedChainId } from "@/utils/aave";
import { useWalletConnection } from "@/utils/walletMethods";
import { ethers } from "ethers";
import { toast } from "sonner";

const BorrowDialog = DialogPrimitive.Root;

const BorrowDialogTrigger = DialogPrimitive.Trigger;

const BorrowDialogPortal = DialogPrimitive.Portal;

const BorrowDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
BorrowDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const BorrowDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <BorrowDialogPortal>
    <BorrowDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-96 max-w-md translate-x-[-50%] translate-y-[-50%] bg-gray-800 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
        className,
      )}
      {...props}
    />
  </BorrowDialogPortal>
));
BorrowDialogContent.displayName = DialogPrimitive.Content.displayName;

const BorrowDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center justify-between mb-6", className)}
    {...props}
  />
);
BorrowDialogHeader.displayName = "BorrowDialogHeader";

const BorrowDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-white text-xl font-semibold", className)}
    {...props}
  />
));
BorrowDialogTitle.displayName = DialogPrimitive.Title.displayName;

const BorrowDialogClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Close
    ref={ref}
    className={cn(
      "text-gray-400 hover:text-white transition-colors",
      className,
    )}
    {...props}
  >
    <X size={20} />
  </DialogPrimitive.Close>
));
BorrowDialogClose.displayName = DialogPrimitive.Close.displayName;

// Health Factor Calculator Utility for Borrowing
const calculateNewHealthFactorForBorrow = (
  currentTotalCollateralUSD: number,
  currentTotalDebtUSD: number,
  newBorrowAmountUSD: number,
  avgLiquidationThreshold: number = 0.85,
): number => {
  const newTotalDebt = currentTotalDebtUSD + newBorrowAmountUSD;

  if (newTotalDebt === 0) {
    return 999; // No debt means very high health factor
  }

  const adjustedCollateral =
    currentTotalCollateralUSD * avgLiquidationThreshold;
  return adjustedCollateral / newTotalDebt;
};

// Health Factor Color Helper
const getHealthFactorColor = (healthFactor: number): string => {
  if (healthFactor >= 2) return "text-green-400";
  if (healthFactor >= 1.5) return "text-yellow-400";
  if (healthFactor >= 1.1) return "text-orange-400";
  return "text-red-400";
};

// Format number helper
const formatNumber = (num: number, decimals = 2): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + "K";
  return num.toFixed(decimals);
};

// Main Borrow Modal Component
interface BorrowModalProps {
  tokenSymbol?: string;
  tokenName?: string;
  availableToBorrow?: string;
  borrowAPY?: string;
  healthFactor?: string;
  tokenPrice?: number;
  liquidationThreshold?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  onBorrow?: (amount: string) => Promise<boolean>;
  children: React.ReactNode;
  isLoading?: boolean;
  tokenAddress?: string;
  tokenDecimals?: number;
}

const BorrowModal: React.FC<BorrowModalProps> = ({
  tokenSymbol = "USDC",
  tokenName = "USD Coin",
  availableToBorrow = "1,000.00",
  borrowAPY = "3.53%",
  healthFactor = "1.24",
  tokenPrice = 1,
  liquidationThreshold = 0.85,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  onBorrow = async () => true,
  children,
  isLoading = false,
  tokenAddress = "",
  tokenDecimals = 18,
}) => {
  const [borrowAmount, setBorrowAmount] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasAcknowledgedRisk, setHasAcknowledgedRisk] = React.useState(false);

  // Get wallet connection info
  const { evmNetwork, isEvmConnected } = useWalletConnection();

  // Calculate USD value and health factor changes
  const borrowAmountNum = parseFloat(borrowAmount) || 0;
  const borrowAmountUSD = borrowAmountNum * tokenPrice;
  const currentHealthFactor = parseFloat(healthFactor) || 0;

  // Calculate new health factor
  const newHealthFactor =
    totalCollateralUSD > 0
      ? calculateNewHealthFactorForBorrow(
          totalCollateralUSD,
          totalDebtUSD,
          borrowAmountUSD,
          liquidationThreshold,
        )
      : currentHealthFactor;

  const healthFactorChange = newHealthFactor - currentHealthFactor;

  // Validation
  const maxBorrow = parseFloat(availableToBorrow.replace(/,/g, "")) || 0;
  const isAmountValid = borrowAmountNum > 0 && borrowAmountNum <= maxBorrow;
  const isHealthFactorSafe = newHealthFactor >= 1.1; // Require minimum 1.1 health factor
  const willReduceHealthFactor = borrowAmountNum > 0 && newHealthFactor < 2.0; // Threshold for requiring acknowledgment
  const needsAcknowledgment = willReduceHealthFactor && !hasAcknowledgedRisk;
  const isFormValid =
    isAmountValid &&
    isHealthFactorSafe &&
    !needsAcknowledgment &&
    !isLoading &&
    !isSubmitting;

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
    if (!tokenAddress) {
      toast.error("Token information missing", {
        description: "Unable to find token contract address",
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
        window.ethereum as ethers.Eip1193Provider,
      );
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Show initial toast
      const toastId = toast.loading(
        `Borrowing ${borrowAmount} ${tokenSymbol}`,
        {
          description: "Confirm borrow transaction in your wallet",
        },
      );

      // Call the real Aave borrow function (using variable rate by default)
      const result = await AaveTransactions.borrowAsset({
        tokenAddress,
        amount: borrowAmount,
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId: currentChainId as SupportedChainId,
        interestRateMode: 2, // 2 for variable rate, 1 for stable
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
        setHasAcknowledgedRisk(false);

        // Call the optional callback
        if (onBorrow) {
          await onBorrow(borrowAmount);
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
    // Calculate safe max borrow amount based on health factor
    const targetHealthFactor = 1.5; // Conservative target
    const maxSafeBorrowUSD =
      (totalCollateralUSD * liquidationThreshold) / targetHealthFactor -
      totalDebtUSD;
    const maxSafeBorrowTokens = Math.max(0, maxSafeBorrowUSD / tokenPrice);
    const safeMax = Math.min(maxBorrow, maxSafeBorrowTokens);
    setBorrowAmount(safeMax.toString());
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setBorrowAmount(value);
      // Reset acknowledgment when amount changes
      setHasAcknowledgedRisk(false);
    }
  };

  return (
    <BorrowDialog open={isOpen} onOpenChange={setIsOpen}>
      <BorrowDialogTrigger asChild>{children}</BorrowDialogTrigger>

      <BorrowDialogContent>
        <BorrowDialogHeader>
          <BorrowDialogTitle>Borrow {tokenSymbol}</BorrowDialogTitle>
          <BorrowDialogClose />
        </BorrowDialogHeader>

        {/* Borrow Input */}
        <div className="mb-6">
          <div
            className={cn(
              "bg-gray-700 rounded-lg p-4 flex items-center justify-between transition-colors",
              !isAmountValid && borrowAmount && "ring-2 ring-red-500",
              !isHealthFactorSafe && borrowAmount && "ring-2 ring-red-500",
            )}
          >
            <div className="flex flex-col flex-1">
              <input
                type="text"
                value={borrowAmount}
                onChange={handleAmountChange}
                disabled={isLoading || isSubmitting}
                className="bg-transparent text-white text-2xl font-semibold outline-none w-full"
                placeholder="0.0"
              />
              <span className="text-gray-400 text-sm">
                ${borrowAmountUSD.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <TrendingDown size={16} color="white" />
              </div>
              <div className="text-white">
                <div className="font-semibold">{tokenSymbol}</div>
                <div className="text-xs text-gray-400">{tokenName}</div>
              </div>
            </div>
          </div>

          {/* Available and validation */}
          <div className="flex justify-between items-center mt-2 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-400">
                Available: {availableToBorrow} {tokenSymbol}
              </span>
              {(!isAmountValid || !isHealthFactorSafe) && borrowAmount && (
                <AlertCircle size={14} className="text-red-400" />
              )}
            </div>
            <button
              onClick={handleMaxClick}
              disabled={isLoading || isSubmitting}
              className="text-orange-400 hover:text-orange-300 transition-colors px-2 py-1 rounded disabled:opacity-50"
            >
              SAFE MAX
            </button>
          </div>

          {/* Validation errors */}
          {!isAmountValid && borrowAmount && (
            <p className="text-red-400 text-xs mt-1">
              {borrowAmountNum > maxBorrow
                ? "Insufficient liquidity"
                : "Enter a valid amount"}
            </p>
          )}
          {!isHealthFactorSafe && borrowAmount && isAmountValid && (
            <p className="text-red-400 text-xs mt-1">
              Unsafe health factor. Reduce borrow amount.
            </p>
          )}
        </div>

        {/* Transaction Overview */}
        {borrowAmountNum > 0 && (
          <div className="mb-4 p-3 bg-gray-750 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-blue-400" />
              <span className="text-sm text-gray-300">
                Transaction Overview
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Borrow Amount</span>
                <span className="text-white">
                  {formatNumber(borrowAmountNum, 6)} {tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">USD Value</span>
                <span className="text-white">
                  ${formatNumber(borrowAmountUSD)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Interest Cost</span>
                <span className="text-red-400">
                  $
                  {formatNumber(
                    borrowAmountUSD *
                      (parseFloat(borrowAPY.replace("%", "")) / 100),
                  )}{" "}
                  / year
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Borrow APY</span>
            <span className="text-red-400">{borrowAPY}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Current Health Factor</span>
            <span className={getHealthFactorColor(currentHealthFactor)}>
              {currentHealthFactor.toFixed(2)}
            </span>
          </div>

          {/* New Health Factor */}
          {borrowAmountNum > 0 && Math.abs(healthFactorChange) > 0.01 && (
            <div className="flex justify-between">
              <span className="text-gray-400">New Health Factor</span>
              <span className={getHealthFactorColor(newHealthFactor)}>
                {newHealthFactor.toFixed(2)}
                <span
                  className={`ml-1 ${healthFactorChange < 0 ? "text-red-400" : "text-green-400"}`}
                >
                  ({healthFactorChange > 0 ? "+" : ""}
                  {healthFactorChange.toFixed(2)})
                </span>
              </span>
            </div>
          )}

          {/* Liquidation warning */}
          {newHealthFactor < 1.5 && borrowAmountNum > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-600 rounded p-2 mt-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-yellow-400" />
                <span className="text-yellow-400 text-xs">
                  {newHealthFactor < 1.1
                    ? "Risk of liquidation"
                    : "Low health factor warning"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Health factor acknowledgment checkbox */}
        {willReduceHealthFactor && (
          <div className="mb-4 p-3 bg-orange-900/20 border border-orange-600 rounded-lg">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="health-factor-acknowledgment"
                checked={hasAcknowledgedRisk}
                onChange={(e) => setHasAcknowledgedRisk(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
              />
              <label
                htmlFor="health-factor-acknowledgment"
                className="text-sm text-orange-300 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown size={14} className="text-orange-400" />
                  <span className="font-medium">Health Factor Impact</span>
                </div>
                <p className="text-xs text-orange-200">
                  I understand that this borrow will reduce my health factor to{" "}
                  {newHealthFactor.toFixed(2)}
                  and acknowledge the increased liquidation risk.
                </p>
              </label>
            </div>
          </div>
        )}

        {/* Borrow Button */}
        <button
          onClick={handleBorrow}
          disabled={!isFormValid}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : isLoading ? (
            "Loading..."
          ) : (
            `Borrow ${borrowAmountNum > 0 ? `${formatNumber(borrowAmountNum, 4)} ` : ""}${tokenSymbol}`
          )}
        </button>
      </BorrowDialogContent>
    </BorrowDialog>
  );
};

export {
  BorrowModal,
  BorrowDialog,
  BorrowDialogTrigger,
  BorrowDialogContent,
  BorrowDialogHeader,
  BorrowDialogTitle,
  BorrowDialogClose,
};
