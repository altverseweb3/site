"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, AlertCircle, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const SwapRateModeDialog = DialogPrimitive.Root;

const SwapRateModeDialogTrigger = DialogPrimitive.Trigger;

const SwapRateModeDialogPortal = DialogPrimitive.Portal;

const SwapRateModeDialogOverlay = React.forwardRef<
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
SwapRateModeDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const SwapRateModeDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <SwapRateModeDialogPortal>
    <SwapRateModeDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-96 max-w-md translate-x-[-50%] translate-y-[-50%] bg-gray-800 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
        className,
      )}
      {...props}
    />
  </SwapRateModeDialogPortal>
));
SwapRateModeDialogContent.displayName = DialogPrimitive.Content.displayName;

const SwapRateModeDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center justify-between mb-6", className)}
    {...props}
  />
);
SwapRateModeDialogHeader.displayName = "SwapRateModeDialogHeader";

const SwapRateModeDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-white text-xl font-semibold", className)}
    {...props}
  />
));
SwapRateModeDialogTitle.displayName = DialogPrimitive.Title.displayName;

const SwapRateModeDialogClose = React.forwardRef<
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
SwapRateModeDialogClose.displayName = DialogPrimitive.Close.displayName;

// Main Swap Rate Mode Modal Component
interface SwapRateModeModalProps {
  tokenSymbol?: string;
  tokenName?: string;
  currentRateMode?: 1 | 2; // 1 = stable, 2 = variable
  currentAPY?: string;
  stableAPY?: string;
  variableAPY?: string;
  borrowedBalance?: string;
  onSwapRateMode?: (newRateMode: 1 | 2) => Promise<boolean>;
  children: React.ReactNode;
  isLoading?: boolean;
}

const SwapRateModeModal: React.FC<SwapRateModeModalProps> = ({
  tokenSymbol = "USDC",
  currentRateMode = 2,
  currentAPY = "3.53%",
  stableAPY = "3.75%",
  variableAPY = "3.53%",
  borrowedBalance = "100.00",
  onSwapRateMode = async () => true,
  children,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const currentMode = currentRateMode === 1 ? "stable" : "variable";
  const targetMode = currentRateMode === 1 ? "variable" : "stable";
  const targetRateMode = currentRateMode === 1 ? 2 : 1;
  const targetAPY = currentRateMode === 1 ? variableAPY : stableAPY;

  // Calculate APY difference
  const currentAPYNum = parseFloat(currentAPY.replace("%", ""));
  const targetAPYNum = parseFloat(targetAPY.replace("%", ""));
  const apyDiff = targetAPYNum - currentAPYNum;
  const isTargetBetter = apyDiff < 0; // Lower APY is better for borrowing

  const handleSwap = async () => {
    setIsSubmitting(true);
    try {
      const success = await onSwapRateMode(targetRateMode);
      if (success) {
        setIsOpen(false);
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SwapRateModeDialog open={isOpen} onOpenChange={setIsOpen}>
      <SwapRateModeDialogTrigger asChild>{children}</SwapRateModeDialogTrigger>

      <SwapRateModeDialogContent>
        <SwapRateModeDialogHeader>
          <SwapRateModeDialogTitle>Swap Rate Mode</SwapRateModeDialogTitle>
          <SwapRateModeDialogClose />
        </SwapRateModeDialogHeader>

        <div className="space-y-4">
          {/* Current Position Info */}
          <div className="bg-gray-750 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-blue-400" />
              <span className="text-sm font-medium text-gray-300">
                Current Position
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Asset</div>
                <div className="text-white">{tokenSymbol}</div>
              </div>
              <div>
                <div className="text-gray-400">Balance</div>
                <div className="text-white">{borrowedBalance}</div>
              </div>
              <div>
                <div className="text-gray-400">Current Rate</div>
                <div className="text-white capitalize">{currentMode}</div>
              </div>
              <div>
                <div className="text-gray-400">Current APY</div>
                <div className="text-red-400">{currentAPY}</div>
              </div>
            </div>
          </div>

          {/* Rate Mode Comparison */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-white">
              Rate Mode Comparison
            </h3>

            {/* Current Rate Mode */}
            <div
              className={cn(
                "border-2 rounded-lg p-3",
                "border-blue-500 bg-blue-900/20",
              )}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-white capitalize">
                    {currentMode} Rate
                  </div>
                  <div className="text-xs text-gray-400">
                    {currentMode === "stable"
                      ? "Fixed rate, no fluctuation"
                      : "Rate changes with market"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-medium">{currentAPY}</div>
                  <div className="text-xs text-blue-400">Current</div>
                </div>
              </div>
            </div>

            {/* Target Rate Mode */}
            <div
              className={cn(
                "border-2 rounded-lg p-3",
                isTargetBetter
                  ? "border-green-500 bg-green-900/20"
                  : "border-orange-500 bg-orange-900/20",
              )}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-white capitalize">
                    {targetMode} Rate
                  </div>
                  <div className="text-xs text-gray-400">
                    {targetMode === "stable"
                      ? "Fixed rate, no fluctuation"
                      : "Rate changes with market"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-medium">{targetAPY}</div>
                  <div
                    className={cn(
                      "text-xs font-medium",
                      isTargetBetter ? "text-green-400" : "text-orange-400",
                    )}
                  >
                    {isTargetBetter ? "Better" : "Higher"} (
                    {apyDiff > 0 ? "+" : ""}
                    {apyDiff.toFixed(2)}%)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning for stable rates */}
          {targetMode === "stable" && (
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-yellow-400 mt-0.5" />
                <div className="text-xs text-yellow-200">
                  <div className="font-medium mb-1">Stable Rate Notice</div>
                  <div>
                    Stable rates provide predictable payments but may have
                    limited availability during high utilization periods.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Impact */}
          <div className="bg-gray-750 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw size={14} className="text-blue-400" />
              <span className="text-sm text-gray-300">After Swap</span>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">New Rate Mode</span>
                <span className="text-white capitalize">{targetMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">New APY</span>
                <span
                  className={isTargetBetter ? "text-green-400" : "text-red-400"}
                >
                  {targetAPY}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Impact</span>
                <span
                  className={
                    isTargetBetter ? "text-green-400" : "text-orange-400"
                  }
                >
                  {isTargetBetter ? "Lower" : "Higher"} interest payments
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={isLoading || isSubmitting}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors mt-6"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Swapping...
            </span>
          ) : isLoading ? (
            "Loading..."
          ) : (
            `Switch to ${targetMode} rate`
          )}
        </button>
      </SwapRateModeDialogContent>
    </SwapRateModeDialog>
  );
};

export {
  SwapRateModeModal,
  SwapRateModeDialog,
  SwapRateModeDialogTrigger,
  SwapRateModeDialogContent,
  SwapRateModeDialogHeader,
  SwapRateModeDialogTitle,
  SwapRateModeDialogClose,
};
