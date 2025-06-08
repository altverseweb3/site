"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, AlertCircle, Info, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const WithdrawDialog = DialogPrimitive.Root;

const WithdrawDialogTrigger = DialogPrimitive.Trigger;

const WithdrawDialogPortal = DialogPrimitive.Portal;

const WithdrawDialogOverlay = React.forwardRef<
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
WithdrawDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const WithdrawDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <WithdrawDialogPortal>
    <WithdrawDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-96 max-w-md translate-x-[-50%] translate-y-[-50%] bg-gray-800 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
        className,
      )}
      {...props}
    />
  </WithdrawDialogPortal>
));
WithdrawDialogContent.displayName = DialogPrimitive.Content.displayName;

const WithdrawDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center justify-between mb-6", className)}
    {...props}
  />
);
WithdrawDialogHeader.displayName = "WithdrawDialogHeader";

const WithdrawDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-white text-xl font-semibold", className)}
    {...props}
  />
));
WithdrawDialogTitle.displayName = DialogPrimitive.Title.displayName;

const WithdrawDialogClose = React.forwardRef<
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
WithdrawDialogClose.displayName = DialogPrimitive.Close.displayName;

// Health Factor Calculator for Withdrawal
const calculateNewHealthFactorForWithdraw = (
  currentTotalCollateralUSD: number,
  currentTotalDebtUSD: number,
  withdrawAmountUSD: number,
  liquidationThreshold: number,
  isUsedAsCollateral: boolean,
): number => {
  if (currentTotalDebtUSD === 0) {
    return 999; // No debt means very high health factor
  }

  // Only reduce collateral if this asset is being used as collateral
  const collateralReduction = isUsedAsCollateral
    ? withdrawAmountUSD * liquidationThreshold
    : 0;
  const newTotalCollateral = Math.max(
    0,
    currentTotalCollateralUSD - collateralReduction,
  );

  return newTotalCollateral / currentTotalDebtUSD;
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

// Main Withdraw Modal Component
interface WithdrawModalProps {
  tokenSymbol?: string;
  tokenName?: string;
  suppliedBalance?: string;
  supplyAPY?: string;
  healthFactor?: string;
  tokenPrice?: number;
  liquidationThreshold?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  isUsedAsCollateral?: boolean;
  onWithdraw?: (amount: string) => Promise<boolean>;
  children: React.ReactNode;
  isLoading?: boolean;
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({
  tokenSymbol = "USDC",
  tokenName = "USD Coin",
  suppliedBalance = "100.00",
  supplyAPY = "3.53%",
  healthFactor = "1.24",
  tokenPrice = 1,
  liquidationThreshold = 0.85,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  isUsedAsCollateral = true,
  onWithdraw = async () => true,
  children,
  isLoading = false,
}) => {
  const [withdrawAmount, setWithdrawAmount] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Calculate USD value and health factor changes
  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const withdrawAmountUSD = withdrawAmountNum * tokenPrice;
  const currentHealthFactor = parseFloat(healthFactor) || 0;

  // Calculate new health factor
  const newHealthFactor =
    totalCollateralUSD > 0
      ? calculateNewHealthFactorForWithdraw(
          totalCollateralUSD,
          totalDebtUSD,
          withdrawAmountUSD,
          liquidationThreshold,
          isUsedAsCollateral,
        )
      : currentHealthFactor;

  const healthFactorChange = newHealthFactor - currentHealthFactor;

  // Validation
  const maxWithdraw = parseFloat(suppliedBalance.replace(/,/g, "")) || 0;
  const isAmountValid =
    withdrawAmountNum > 0 && withdrawAmountNum <= maxWithdraw;

  // Health factor safety check - only if asset is used as collateral and there's debt
  const isHealthFactorSafe =
    !isUsedAsCollateral || totalDebtUSD === 0 || newHealthFactor >= 1.1;
  const isFormValid =
    isAmountValid && isHealthFactorSafe && !isLoading && !isSubmitting;

  const handleWithdraw = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const success = await onWithdraw(withdrawAmount);
      if (success) {
        setIsOpen(false);
        setWithdrawAmount("");
      }
    } catch (error) {
      console.error("Withdraw failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaxClick = () => {
    if (!isUsedAsCollateral || totalDebtUSD === 0) {
      // Can withdraw everything if not used as collateral or no debt
      setWithdrawAmount(maxWithdraw.toString());
      return;
    }

    // Calculate safe max withdrawal to maintain health factor above 1.5
    const targetHealthFactor = 1.5;
    const requiredCollateral = totalDebtUSD * targetHealthFactor;
    const maxWithdrawableCollateral = Math.max(
      0,
      totalCollateralUSD - requiredCollateral,
    );
    const maxWithdrawableUSD = maxWithdrawableCollateral / liquidationThreshold;
    const maxWithdrawableTokens = maxWithdrawableUSD / tokenPrice;

    const safeMax = Math.min(maxWithdraw, maxWithdrawableTokens);
    setWithdrawAmount(Math.max(0, safeMax).toString());
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setWithdrawAmount(value);
    }
  };

  // Calculate interest loss
  const yearlyInterestLoss =
    withdrawAmountUSD * (parseFloat(supplyAPY.replace("%", "")) / 100);

  return (
    <WithdrawDialog open={isOpen} onOpenChange={setIsOpen}>
      <WithdrawDialogTrigger asChild>{children}</WithdrawDialogTrigger>

      <WithdrawDialogContent>
        <WithdrawDialogHeader>
          <WithdrawDialogTitle>Withdraw {tokenSymbol}</WithdrawDialogTitle>
          <WithdrawDialogClose />
        </WithdrawDialogHeader>

        {/* Withdraw Input */}
        <div className="mb-6">
          <div
            className={cn(
              "bg-gray-700 rounded-lg p-4 flex items-center justify-between transition-colors",
              !isAmountValid && withdrawAmount && "ring-2 ring-red-500",
              !isHealthFactorSafe && withdrawAmount && "ring-2 ring-red-500",
            )}
          >
            <div className="flex flex-col flex-1">
              <input
                type="text"
                value={withdrawAmount}
                onChange={handleAmountChange}
                disabled={isLoading || isSubmitting}
                className="bg-transparent text-white text-2xl font-semibold outline-none w-full"
                placeholder="0.0"
              />
              <span className="text-gray-400 text-sm">
                ${withdrawAmountUSD.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Minus size={16} color="white" />
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
                Supplied: {suppliedBalance} {tokenSymbol}
              </span>
              {(!isAmountValid || !isHealthFactorSafe) && withdrawAmount && (
                <AlertCircle size={14} className="text-red-400" />
              )}
            </div>
            <button
              onClick={handleMaxClick}
              disabled={isLoading || isSubmitting}
              className="text-orange-400 hover:text-orange-300 transition-colors px-2 py-1 rounded disabled:opacity-50"
            >
              {isUsedAsCollateral && totalDebtUSD > 0 ? "SAFE MAX" : "MAX"}
            </button>
          </div>

          {/* Validation errors */}
          {!isAmountValid && withdrawAmount && (
            <p className="text-red-400 text-xs mt-1">
              {withdrawAmountNum > maxWithdraw
                ? "Amount exceeds supplied balance"
                : "Enter a valid amount"}
            </p>
          )}
          {!isHealthFactorSafe && withdrawAmount && isAmountValid && (
            <p className="text-red-400 text-xs mt-1">
              Unsafe health factor. Reduce withdrawal amount.
            </p>
          )}
        </div>

        {/* Collateral Status Warning */}
        {isUsedAsCollateral && withdrawAmountNum > 0 && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-yellow-400" />
              <span className="text-yellow-400 text-xs">
                This asset is used as collateral. Withdrawal will reduce your
                borrowing power.
              </span>
            </div>
          </div>
        )}

        {/* Transaction Overview */}
        {withdrawAmountNum > 0 && (
          <div className="mb-4 p-3 bg-gray-750 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-blue-400" />
              <span className="text-sm text-gray-300">
                Transaction Overview
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Withdraw Amount</span>
                <span className="text-white">
                  {formatNumber(withdrawAmountNum, 6)} {tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">USD Value</span>
                <span className="text-white">
                  ${formatNumber(withdrawAmountUSD)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Interest Loss</span>
                <span className="text-red-400">
                  ${formatNumber(yearlyInterestLoss)} / year
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Remaining Supply</span>
                <span className="text-white">
                  {formatNumber(maxWithdraw - withdrawAmountNum, 6)}{" "}
                  {tokenSymbol}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Supply APY</span>
            <span className="text-green-400">{supplyAPY}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Used as Collateral</span>
            <span
              className={
                isUsedAsCollateral ? "text-green-400" : "text-gray-400"
              }
            >
              {isUsedAsCollateral ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Current Health Factor</span>
            <span className={getHealthFactorColor(currentHealthFactor)}>
              {currentHealthFactor.toFixed(2)}
            </span>
          </div>

          {/* New Health Factor */}
          {withdrawAmountNum > 0 &&
            Math.abs(healthFactorChange) > 0.01 &&
            isUsedAsCollateral &&
            totalDebtUSD > 0 && (
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
        </div>

        {/* Withdraw Button */}
        <button
          onClick={handleWithdraw}
          disabled={!isFormValid}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : isLoading ? (
            "Loading..."
          ) : (
            `Withdraw ${withdrawAmountNum > 0 ? `${formatNumber(withdrawAmountNum, 4)} ` : ""}${tokenSymbol}`
          )}
        </button>
      </WithdrawDialogContent>
    </WithdrawDialog>
  );
};

export {
  WithdrawModal,
  WithdrawDialog,
  WithdrawDialogTrigger,
  WithdrawDialogContent,
  WithdrawDialogHeader,
  WithdrawDialogTitle,
  WithdrawDialogClose,
};
