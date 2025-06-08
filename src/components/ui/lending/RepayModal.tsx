"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, AlertCircle, Info, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const RepayDialog = DialogPrimitive.Root;

const RepayDialogTrigger = DialogPrimitive.Trigger;

const RepayDialogPortal = DialogPrimitive.Portal;

const RepayDialogOverlay = React.forwardRef<
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
RepayDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const RepayDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <RepayDialogPortal>
    <RepayDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-96 max-w-md translate-x-[-50%] translate-y-[-50%] bg-gray-800 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
        className,
      )}
      {...props}
    />
  </RepayDialogPortal>
));
RepayDialogContent.displayName = DialogPrimitive.Content.displayName;

const RepayDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center justify-between mb-6", className)}
    {...props}
  />
);
RepayDialogHeader.displayName = "RepayDialogHeader";

const RepayDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-white text-xl font-semibold", className)}
    {...props}
  />
));
RepayDialogTitle.displayName = DialogPrimitive.Title.displayName;

const RepayDialogClose = React.forwardRef<
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
RepayDialogClose.displayName = DialogPrimitive.Close.displayName;

// Health Factor Calculator Utility for Repaying
const calculateNewHealthFactorForRepay = (
  currentTotalCollateralUSD: number,
  currentTotalDebtUSD: number,
  repayAmountUSD: number,
  avgLiquidationThreshold: number = 0.85,
): number => {
  const newTotalDebt = Math.max(0, currentTotalDebtUSD - repayAmountUSD);

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

// Main Repay Modal Component
interface RepayModalProps {
  tokenSymbol?: string;
  tokenName?: string;
  borrowedBalance?: string;
  borrowAPY?: string;
  healthFactor?: string;
  tokenPrice?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  onRepay?: (amount: string) => Promise<boolean>;
  children: React.ReactNode;
  isLoading?: boolean;
}

const RepayModal: React.FC<RepayModalProps> = ({
  tokenSymbol = "USDC",
  tokenName = "USD Coin",
  borrowedBalance = "100.00",
  borrowAPY = "3.53%",
  healthFactor = "1.24",
  tokenPrice = 1,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  onRepay = async () => true,
  children,
  isLoading = false,
}) => {
  const [repayAmount, setRepayAmount] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Calculate USD value and health factor changes
  const repayAmountNum = parseFloat(repayAmount) || 0;
  const repayAmountUSD = repayAmountNum * tokenPrice;
  const currentHealthFactor = parseFloat(healthFactor) || 0;

  // Calculate new health factor
  const newHealthFactor =
    totalCollateralUSD > 0
      ? calculateNewHealthFactorForRepay(
          totalCollateralUSD,
          totalDebtUSD,
          repayAmountUSD,
        )
      : currentHealthFactor;

  const healthFactorChange = newHealthFactor - currentHealthFactor;

  // Validation
  const maxRepay = parseFloat(borrowedBalance.replace(/,/g, "")) || 0;
  const isAmountValid = repayAmountNum > 0 && repayAmountNum <= maxRepay;
  const isFormValid = isAmountValid && !isLoading && !isSubmitting;

  const handleRepay = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const success = await onRepay(repayAmount);
      if (success) {
        setIsOpen(false);
        setRepayAmount("");
      }
    } catch (error) {
      console.error("Repay failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaxClick = () => {
    setRepayAmount(maxRepay.toString());
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setRepayAmount(value);
    }
  };

  // Calculate interest savings
  const yearlyInterestSavings =
    repayAmountUSD * (parseFloat(borrowAPY.replace("%", "")) / 100);

  return (
    <RepayDialog open={isOpen} onOpenChange={setIsOpen}>
      <RepayDialogTrigger asChild>{children}</RepayDialogTrigger>

      <RepayDialogContent>
        <RepayDialogHeader>
          <RepayDialogTitle>Repay {tokenSymbol}</RepayDialogTitle>
          <RepayDialogClose />
        </RepayDialogHeader>

        {/* Repay Input */}
        <div className="mb-6">
          <div
            className={cn(
              "bg-gray-700 rounded-lg p-4 flex items-center justify-between transition-colors",
              !isAmountValid && repayAmount && "ring-2 ring-red-500",
            )}
          >
            <div className="flex flex-col flex-1">
              <input
                type="text"
                value={repayAmount}
                onChange={handleAmountChange}
                disabled={isLoading || isSubmitting}
                className="bg-transparent text-white text-2xl font-semibold outline-none w-full"
                placeholder="0.0"
              />
              <span className="text-gray-400 text-sm">
                ${repayAmountUSD.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <TrendingUp size={16} color="white" />
              </div>
              <div className="text-white">
                <div className="font-semibold">{tokenSymbol}</div>
                <div className="text-xs text-gray-400">{tokenName}</div>
              </div>
            </div>
          </div>

          {/* Balance and validation */}
          <div className="flex justify-between items-center mt-2 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-400">
                Borrowed: {borrowedBalance} {tokenSymbol}
              </span>
              {!isAmountValid && repayAmount && (
                <AlertCircle size={14} className="text-red-400" />
              )}
            </div>
            <button
              onClick={handleMaxClick}
              disabled={isLoading || isSubmitting}
              className="text-orange-400 hover:text-orange-300 transition-colors px-2 py-1 rounded disabled:opacity-50"
            >
              MAX
            </button>
          </div>

          {/* Validation error */}
          {!isAmountValid && repayAmount && (
            <p className="text-red-400 text-xs mt-1">
              {repayAmountNum > maxRepay
                ? "Amount exceeds borrowed balance"
                : "Enter a valid amount"}
            </p>
          )}
        </div>

        {/* Transaction Overview */}
        {repayAmountNum > 0 && (
          <div className="mb-4 p-3 bg-gray-750 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-blue-400" />
              <span className="text-sm text-gray-300">
                Transaction Overview
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Repay Amount</span>
                <span className="text-white">
                  {formatNumber(repayAmountNum, 6)} {tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">USD Value</span>
                <span className="text-white">
                  ${formatNumber(repayAmountUSD)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Interest Savings</span>
                <span className="text-green-400">
                  ${formatNumber(yearlyInterestSavings)} / year
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Remaining Debt</span>
                <span className="text-white">
                  {formatNumber(maxRepay - repayAmountNum, 6)} {tokenSymbol}
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
          {repayAmountNum > 0 && Math.abs(healthFactorChange) > 0.01 && (
            <div className="flex justify-between">
              <span className="text-gray-400">New Health Factor</span>
              <span className={getHealthFactorColor(newHealthFactor)}>
                {newHealthFactor > 999 ? "∞" : newHealthFactor.toFixed(2)}
                <span className="text-green-400 ml-1">
                  (+
                  {healthFactorChange > 999
                    ? "∞"
                    : healthFactorChange.toFixed(2)}
                  )
                </span>
              </span>
            </div>
          )}

          {/* Full repay notice */}
          {repayAmountNum >= maxRepay && maxRepay > 0 && (
            <div className="bg-green-900/20 border border-green-600 rounded p-2 mt-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-green-400" />
                <span className="text-green-400 text-xs">
                  Full repayment will close this position
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Repay Button */}
        <button
          onClick={handleRepay}
          disabled={!isFormValid}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : isLoading ? (
            "Loading..."
          ) : (
            `Repay ${repayAmountNum > 0 ? `${formatNumber(repayAmountNum, 4)} ` : ""}${tokenSymbol}`
          )}
        </button>
      </RepayDialogContent>
    </RepayDialog>
  );
};

export {
  RepayModal,
  RepayDialog,
  RepayDialogTrigger,
  RepayDialogContent,
  RepayDialogHeader,
  RepayDialogTitle,
  RepayDialogClose,
};
