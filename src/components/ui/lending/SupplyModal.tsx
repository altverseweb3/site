"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, DollarSign, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { AaveTransactions, SupportedChainId } from "@/utils/aave";
import { useWalletConnection } from "@/utils/walletMethods";
import { ethers } from "ethers";
import { toast } from "sonner";

const SupplyDialog = DialogPrimitive.Root;

const SupplyDialogTrigger = DialogPrimitive.Trigger;

const SupplyDialogPortal = DialogPrimitive.Portal;

const SupplyDialogOverlay = React.forwardRef<
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
SupplyDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const SupplyDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <SupplyDialogPortal>
    <SupplyDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-96 max-w-md translate-x-[-50%] translate-y-[-50%] bg-gray-800 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
        className,
      )}
      {...props}
    />
  </SupplyDialogPortal>
));
SupplyDialogContent.displayName = DialogPrimitive.Content.displayName;

const SupplyDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center justify-between mb-6", className)}
    {...props}
  />
);
SupplyDialogHeader.displayName = "SupplyDialogHeader";

const SupplyDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-white text-xl font-semibold", className)}
    {...props}
  />
));
SupplyDialogTitle.displayName = DialogPrimitive.Title.displayName;

const SupplyDialogClose = React.forwardRef<
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
SupplyDialogClose.displayName = DialogPrimitive.Close.displayName;

// Health Factor Calculator Utility
const calculateNewHealthFactor = (
  currentTotalCollateralUSD: number,
  currentTotalDebtUSD: number,
  newSupplyAmountUSD: number,
  liquidationThreshold: number,
): number => {
  if (currentTotalDebtUSD === 0) {
    return 999; // No debt means very high health factor
  }

  const newTotalCollateral = currentTotalCollateralUSD + newSupplyAmountUSD;
  const adjustedCollateral = newTotalCollateral * liquidationThreshold;

  return adjustedCollateral / currentTotalDebtUSD;
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

// Main Supply Modal Component
interface SupplyModalProps {
  tokenSymbol?: string;
  tokenName?: string;
  balance?: string;
  supplyAPY?: string;
  collateralizationStatus?: "enabled" | "disabled";
  healthFactor?: string;
  tokenPrice?: number; // Current token price in USD
  liquidationThreshold?: number; // LTV for this asset (e.g., 0.85 = 85%)
  totalCollateralUSD?: number; // Current total collateral in USD
  totalDebtUSD?: number; // Current total debt in USD
  onSupply?: (amount: string) => Promise<boolean>;
  children: React.ReactNode; // The trigger element
  isLoading?: boolean; // Loading state from parent
  tokenAddress?: string; // Token contract address
  tokenDecimals?: number; // Token decimals
}

const SupplyModal: React.FC<SupplyModalProps> = ({
  tokenSymbol = "USDC",
  tokenName = "USD Coin",
  balance = "1,234.56",
  supplyAPY = "3.53%",
  collateralizationStatus = "enabled",
  healthFactor = "1.24",
  tokenPrice = 1, // Default to $1 if not provided
  liquidationThreshold = 0.85, // Default 85% LTV
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  onSupply = async () => true,
  children,
  isLoading = false,
  tokenAddress = "", // Token contract address
  tokenDecimals = 18, // Token decimals
}) => {
  const [supplyAmount, setSupplyAmount] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Get wallet connection info
  const { evmNetwork, isEvmConnected } = useWalletConnection();

  // Calculate USD value and health factor changes
  const supplyAmountNum = parseFloat(supplyAmount) || 0;
  const supplyAmountUSD = supplyAmountNum * tokenPrice;
  const currentHealthFactor = parseFloat(healthFactor) || 0;

  // Calculate new health factor only if asset can be collateral and there's debt
  const newHealthFactor =
    collateralizationStatus === "enabled" && totalDebtUSD > 0
      ? calculateNewHealthFactor(
          totalCollateralUSD,
          totalDebtUSD,
          supplyAmountUSD,
          liquidationThreshold,
        )
      : currentHealthFactor;

  const healthFactorChange = newHealthFactor - currentHealthFactor;

  // Simplified validation - just check if amount is positive
  const isAmountValid = supplyAmountNum > 0;
  const isFormValid = isAmountValid && !isLoading && !isSubmitting;

  const handleSupply = async () => {
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
        description: `Unable to find token contract address for ${tokenSymbol}. Address: ${tokenAddress || "undefined"}`,
      });
      console.error("❌ Invalid token address:", { tokenAddress, tokenSymbol });
      return;
    }

    // Check if we have valid decimals
    if (!tokenDecimals || tokenDecimals <= 0) {
      toast.error("Token decimals missing", {
        description: `Invalid token decimals for ${tokenSymbol}: ${tokenDecimals}`,
      });
      console.error("❌ Invalid token decimals:", {
        tokenDecimals,
        tokenSymbol,
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

      console.log("🔍 Supply Modal Debug:", {
        evmNetwork,
        currentChainId,
        tokenAddress,
        tokenDecimals,
        tokenSymbol,
        supplyAmount,
        isEvmConnected,
      });

      // Get signer from window.ethereum
      if (!window.ethereum) {
        throw new Error("MetaMask not found");
      }

      const provider = new ethers.BrowserProvider(
        window.ethereum as ethers.Eip1193Provider,
      );
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      console.log(
        `🚀 Starting Aave supply: ${supplyAmount} ${tokenSymbol} on chain ${currentChainId}`,
      );

      // Show initial toast
      const toastId = toast.loading(
        `Supplying ${supplyAmount} ${tokenSymbol}`,
        {
          description: "Approve token transfer and supply to Aave",
        },
      );

      // Call the real Aave supply function
      const result = await AaveTransactions.supplyAsset({
        tokenAddress,
        amount: supplyAmount,
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId: currentChainId as SupportedChainId,
        signer,
      });

      if (result.success) {
        toast.success(`Successfully supplied ${supplyAmount} ${tokenSymbol}`, {
          id: toastId,
          description: `Transaction: ${result.txHash?.slice(0, 10)}...`,
        });

        // Reset form and close modal
        setIsOpen(false);
        setSupplyAmount("");

        // Call the optional callback
        if (onSupply) {
          await onSupply(supplyAmount);
        }
      } else {
        toast.error("Supply failed", {
          id: toastId,
          description: result.error || "Transaction failed",
        });
      }
    } catch (error: unknown) {
      console.error("Supply failed:", error);
      toast.error("Supply failed", {
        description: (error as Error).message || "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaxClick = () => {
    // Parse the balance string to get numeric value
    const maxBalance = parseFloat(balance.replace(/,/g, "")) || 0;
    // Leave small amount for gas fees if it's ETH/native token
    const isNativeToken = ["ETH", "MATIC", "AVAX", "BNB"].includes(
      tokenSymbol.toUpperCase(),
    );
    const adjustedMax = isNativeToken
      ? Math.max(0, maxBalance - 0.01)
      : maxBalance;
    setSupplyAmount(adjustedMax.toString());
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only valid number input
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setSupplyAmount(value);
    }
  };

  return (
    <SupplyDialog open={isOpen} onOpenChange={setIsOpen}>
      <SupplyDialogTrigger asChild>{children}</SupplyDialogTrigger>

      <SupplyDialogContent>
        <SupplyDialogHeader>
          <SupplyDialogTitle>Supply {tokenSymbol}</SupplyDialogTitle>
          <SupplyDialogClose />
        </SupplyDialogHeader>

        {/* Supply Input */}
        <div className="mb-6">
          <div
            className={cn(
              "bg-gray-700 rounded-lg p-4 flex items-center justify-between transition-colors",
              !isAmountValid && supplyAmount && "ring-2 ring-red-500",
            )}
          >
            <div className="flex flex-col flex-1">
              <input
                type="text"
                value={supplyAmount}
                onChange={handleAmountChange}
                disabled={isLoading || isSubmitting}
                className="bg-transparent text-white text-2xl font-semibold outline-none w-full"
                placeholder="0.0"
              />
              <span className="text-gray-400 text-sm">
                ${supplyAmountUSD.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <DollarSign size={16} color="white" />
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
                Balance: {balance} {tokenSymbol}
              </span>
              {!isAmountValid && supplyAmount && (
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
          {!isAmountValid && supplyAmount && (
            <p className="text-red-400 text-xs mt-1">Enter a valid amount</p>
          )}
        </div>

        {/* Transaction Overview */}
        {supplyAmountNum > 0 && (
          <div className="mb-4 p-3 bg-gray-750 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-blue-400" />
              <span className="text-sm text-gray-300">
                Transaction Overview
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Supply Amount</span>
                <span className="text-white">
                  {formatNumber(supplyAmountNum, 6)} {tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">USD Value</span>
                <span className="text-white">
                  ${formatNumber(supplyAmountUSD)}
                </span>
              </div>
              {collateralizationStatus === "enabled" && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Collateral Power</span>
                  <span className="text-green-400">
                    ${formatNumber(supplyAmountUSD * liquidationThreshold)}
                  </span>
                </div>
              )}
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
            <span className="text-gray-400">Collateralization</span>
            <span
              className={`${collateralizationStatus === "enabled" ? "text-green-400" : "text-gray-400"}`}
            >
              {collateralizationStatus}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Current Health Factor</span>
            <span className={getHealthFactorColor(currentHealthFactor)}>
              {currentHealthFactor.toFixed(2)}
            </span>
          </div>

          {/* New Health Factor (only show if there's a meaningful change) */}
          {supplyAmountNum > 0 && Math.abs(healthFactorChange) > 0.01 && (
            <div className="flex justify-between">
              <span className="text-gray-400">New Health Factor</span>
              <span className={getHealthFactorColor(newHealthFactor)}>
                {newHealthFactor.toFixed(2)}
                <span className="text-green-400 ml-1">
                  (+{healthFactorChange.toFixed(2)})
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Supply Button */}
        <button
          onClick={handleSupply}
          disabled={!isFormValid}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : isLoading ? (
            "Loading..."
          ) : (
            `Supply ${supplyAmountNum > 0 ? `${formatNumber(supplyAmountNum, 4)} ` : ""}${tokenSymbol}`
          )}
        </button>
      </SupplyDialogContent>
    </SupplyDialog>
  );
};

export {
  SupplyModal,
  SupplyDialog,
  SupplyDialogTrigger,
  SupplyDialogContent,
  SupplyDialogHeader,
  SupplyDialogTitle,
  SupplyDialogClose,
};
