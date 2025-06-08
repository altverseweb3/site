"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Shield, ShieldOff, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const CollateralToggleDialog = DialogPrimitive.Root;

const CollateralToggleDialogTrigger = DialogPrimitive.Trigger;

const CollateralToggleDialogPortal = DialogPrimitive.Portal;

const CollateralToggleDialogOverlay = React.forwardRef<
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
CollateralToggleDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const CollateralToggleDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <CollateralToggleDialogPortal>
    <CollateralToggleDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-96 max-w-md translate-x-[-50%] translate-y-[-50%] bg-gray-800 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
        className,
      )}
      {...props}
    />
  </CollateralToggleDialogPortal>
));
CollateralToggleDialogContent.displayName = DialogPrimitive.Content.displayName;

const CollateralToggleDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center justify-between mb-6", className)}
    {...props}
  />
);
CollateralToggleDialogHeader.displayName = "CollateralToggleDialogHeader";

const CollateralToggleDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-white text-xl font-semibold", className)}
    {...props}
  />
));
CollateralToggleDialogTitle.displayName = DialogPrimitive.Title.displayName;

const CollateralToggleDialogClose = React.forwardRef<
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
CollateralToggleDialogClose.displayName = DialogPrimitive.Close.displayName;

// Health Factor Calculator for Collateral Toggle
const calculateNewHealthFactorForCollateralToggle = (
  currentTotalCollateralUSD: number,
  currentTotalDebtUSD: number,
  assetValueUSD: number,
  liquidationThreshold: number,
  currentlyEnabled: boolean,
): number => {
  if (currentTotalDebtUSD === 0) {
    return 999; // No debt means very high health factor
  }

  let newTotalCollateral: number;

  if (currentlyEnabled) {
    // Disabling collateral - reduce collateral power
    newTotalCollateral =
      currentTotalCollateralUSD - assetValueUSD * liquidationThreshold;
  } else {
    // Enabling collateral - increase collateral power
    newTotalCollateral =
      currentTotalCollateralUSD + assetValueUSD * liquidationThreshold;
  }

  return Math.max(0, newTotalCollateral) / currentTotalDebtUSD;
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

// Main Collateral Toggle Modal Component
interface CollateralToggleModalProps {
  tokenSymbol?: string;
  tokenName?: string;
  suppliedBalance?: string;
  healthFactor?: string;
  tokenPrice?: number;
  liquidationThreshold?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  currentlyEnabled?: boolean;
  canBeUsedAsCollateral?: boolean;
  onToggleCollateral?: (enable: boolean) => Promise<boolean>;
  children: React.ReactNode;
  isLoading?: boolean;
}

const CollateralToggleModal: React.FC<CollateralToggleModalProps> = ({
  tokenSymbol = "USDC",
  tokenName = "USD Coin",
  suppliedBalance = "100.00",
  healthFactor = "1.24",
  tokenPrice = 1,
  liquidationThreshold = 0.85,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  currentlyEnabled = true,
  canBeUsedAsCollateral = true,
  onToggleCollateral = async () => true,
  children,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Calculate impact
  const suppliedBalanceNum = parseFloat(suppliedBalance.replace(/,/g, "")) || 0;
  const assetValueUSD = suppliedBalanceNum * tokenPrice;
  const currentHealthFactor = parseFloat(healthFactor) || 0;

  // Calculate new health factor
  const newHealthFactor =
    totalCollateralUSD > 0
      ? calculateNewHealthFactorForCollateralToggle(
          totalCollateralUSD,
          totalDebtUSD,
          assetValueUSD,
          liquidationThreshold,
          currentlyEnabled,
        )
      : currentHealthFactor;

  const healthFactorChange = newHealthFactor - currentHealthFactor;

  // Safety checks
  const wouldBeUnsafe = !currentlyEnabled
    ? false
    : newHealthFactor < 1.1 && totalDebtUSD > 0;
  const canToggle =
    canBeUsedAsCollateral && !wouldBeUnsafe && !isLoading && !isSubmitting;

  const handleToggle = async () => {
    if (!canToggle) return;

    setIsSubmitting(true);
    try {
      const success = await onToggleCollateral(!currentlyEnabled);
      if (success) {
        setIsOpen(false);
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate collateral power change
  const collateralPowerChange = assetValueUSD * liquidationThreshold;

  return (
    <CollateralToggleDialog open={isOpen} onOpenChange={setIsOpen}>
      <CollateralToggleDialogTrigger asChild>
        {children}
      </CollateralToggleDialogTrigger>

      <CollateralToggleDialogContent>
        <CollateralToggleDialogHeader>
          <CollateralToggleDialogTitle>
            {currentlyEnabled ? "Disable" : "Enable"} {tokenSymbol} Collateral
          </CollateralToggleDialogTitle>
          <CollateralToggleDialogClose />
        </CollateralToggleDialogHeader>

        {/* Asset Info */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentlyEnabled ? "bg-orange-500" : "bg-gray-500"
              }`}
            >
              {currentlyEnabled ? (
                <Shield size={20} />
              ) : (
                <ShieldOff size={20} />
              )}
            </div>
            <div>
              <div className="text-white font-semibold">{tokenName}</div>
              <div className="text-gray-400 text-sm">{tokenSymbol}</div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Supplied Balance</span>
              <span className="text-white">
                {suppliedBalance} {tokenSymbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">USD Value</span>
              <span className="text-white">${formatNumber(assetValueUSD)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Liquidation Threshold</span>
              <span className="text-white">
                {(liquidationThreshold * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Cannot be used as collateral warning */}
        {!canBeUsedAsCollateral && (
          <div className="mb-4 p-3 bg-gray-900/50 border border-gray-600 rounded-lg">
            <div className="flex items-center gap-2">
              <ShieldOff size={14} className="text-gray-400" />
              <span className="text-gray-400 text-sm">
                This asset cannot be used as collateral
              </span>
            </div>
          </div>
        )}

        {/* Unsafe operation warning */}
        {wouldBeUnsafe && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-600 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-red-400 text-sm">
                Disabling this collateral would make your position unsafe
              </span>
            </div>
          </div>
        )}

        {/* Impact Overview */}
        {canBeUsedAsCollateral && (
          <div className="mb-4 p-3 bg-gray-750 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-blue-400" />
              <span className="text-sm text-gray-300">Impact Overview</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Action</span>
                <span className="text-white">
                  {currentlyEnabled ? "Disable" : "Enable"} as collateral
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Collateral Power Change</span>
                <span
                  className={
                    currentlyEnabled ? "text-red-400" : "text-green-400"
                  }
                >
                  {currentlyEnabled ? "-" : "+"}$
                  {formatNumber(collateralPowerChange)}
                </span>
              </div>
              {totalDebtUSD > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Borrowing Power</span>
                  <span
                    className={
                      currentlyEnabled ? "text-red-400" : "text-green-400"
                    }
                  >
                    {currentlyEnabled ? "Reduced" : "Increased"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Health Factor Impact */}
        {totalDebtUSD > 0 && canBeUsedAsCollateral && (
          <div className="mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Current Health Factor</span>
              <span className={getHealthFactorColor(currentHealthFactor)}>
                {currentHealthFactor.toFixed(2)}
              </span>
            </div>

            {Math.abs(healthFactorChange) > 0.01 && (
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
        )}

        {/* Information sections */}
        <div className="mb-6 p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
          <div className="text-blue-400 text-sm font-medium mb-2">
            {currentlyEnabled
              ? "Disabling Collateral:"
              : "Enabling Collateral:"}
          </div>
          <ul className="text-blue-300 text-xs space-y-1">
            {currentlyEnabled ? (
              <>
                <li>• Reduces your borrowing power</li>
                <li>• Allows you to withdraw this asset freely</li>
                <li>• May improve your health factor if you have debt</li>
              </>
            ) : (
              <>
                <li>• Increases your borrowing power</li>
                <li>• This asset can be liquidated if health factor drops</li>
                <li>• Withdrawal becomes limited by health factor</li>
              </>
            )}
          </ul>
        </div>

        {/* Toggle Button */}
        <button
          onClick={handleToggle}
          disabled={!canToggle}
          className={cn(
            "w-full font-semibold py-3 rounded-lg transition-colors",
            currentlyEnabled
              ? "bg-red-500 hover:bg-red-600 disabled:bg-gray-600"
              : "bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600",
            "disabled:cursor-not-allowed text-white",
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : isLoading ? (
            "Loading..."
          ) : !canBeUsedAsCollateral ? (
            "Cannot be used as collateral"
          ) : wouldBeUnsafe ? (
            "Would make position unsafe"
          ) : (
            `${currentlyEnabled ? "Disable" : "Enable"} Collateral`
          )}
        </button>
      </CollateralToggleDialogContent>
    </CollateralToggleDialog>
  );
};

export {
  CollateralToggleModal,
  CollateralToggleDialog,
  CollateralToggleDialogTrigger,
  CollateralToggleDialogContent,
  CollateralToggleDialogHeader,
  CollateralToggleDialogTitle,
  CollateralToggleDialogClose,
};
