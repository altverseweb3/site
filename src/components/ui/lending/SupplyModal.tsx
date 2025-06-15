"use client";

import * as React from "react";
import Image from "next/image";
import { AlertCircle, Info, ArrowRight } from "lucide-react";
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
import { AaveTransactions, SupportedChainId } from "@/utils/aave/interact";
import { useWalletConnection } from "@/utils/walletMethods";
import { ethers } from "ethers";
import { toast } from "sonner";

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
  if (healthFactor >= 2) return "text-green-500";
  if (healthFactor >= 1.5) return "text-yellow-500";
  if (healthFactor >= 1.1) return "text-orange-500";
  return "text-red-500";
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
  tokenIcon?: string; // Token icon filename (e.g., "usdc.png")
  chainId?: number; // Chain ID for token image path
  balance?: string;
  supplyAPY?: string;
  collateralizationStatus?: "enabled" | "disabled" | "isolation" | "none";
  isolationModeEnabled?: boolean; // Whether the asset is in isolation mode
  canBeCollateral?: boolean; // Whether the asset can be used as collateral
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
  maxLTV?: number; // Maximum LTV for this asset
  liquidationBonus?: number; // Liquidation bonus for this asset
}

const SupplyModal: React.FC<SupplyModalProps> = ({
  tokenSymbol = "USDC",
  tokenName = "USD Coin",
  tokenIcon = "usdc.png",
  chainId = 1,
  balance = "1,234.56",
  supplyAPY = "3.53%",
  collateralizationStatus = "enabled",
  isolationModeEnabled = false,
  canBeCollateral = true,
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
  const [isMounted, setIsMounted] = React.useState(false);
  const [hasImageError, setHasImageError] = React.useState(false);

  // Get wallet connection info
  const { evmNetwork, isEvmConnected } = useWalletConnection();

  // Chain name mapping (same as SupplyUnownedCard)
  const chainNames: Record<number, string> = {
    1: "ethereum",
    137: "polygon",
    42161: "arbitrum",
    10: "optimism",
    43114: "avalanche",
    8453: "base",
    100: "gnosis",
    56: "bsc",
  };

  const chainName = chainNames[chainId] || "ethereum";
  const fallbackIcon = tokenSymbol.charAt(0).toUpperCase();

  // Image path logic (same as SupplyUnownedCard)
  const getImagePath = () => {
    if (!tokenIcon || tokenIcon === "unknown.png" || hasImageError) {
      return null;
    }
    return `/tokens/${chainName}/pngs/${tokenIcon}`;
  };

  const imagePath = getImagePath();

  // Handle client-side mounting to prevent hydration mismatch
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isMounted) return;

    if (isOpen) {
      setSupplyAmount("");
    } else {
      setSupplyAmount("");
    }
  }, [isOpen, isMounted]);

  // Don't render on server to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  // Calculate USD value and health factor changes
  const supplyAmountNum = parseFloat(supplyAmount) || 0;
  const supplyAmountUSD = supplyAmountNum * tokenPrice;
  const currentHealthFactor = parseFloat(healthFactor) || 0;

  // Calculate new health factor only if asset can be collateral and there's debt
  const newHealthFactor =
    canBeCollateral && totalDebtUSD > 0
      ? calculateNewHealthFactor(
          totalCollateralUSD,
          totalDebtUSD,
          supplyAmountUSD,
          liquidationThreshold,
        )
      : currentHealthFactor;

  // Helper function to get collateral status display
  const getCollateralStatusDisplay = () => {
    if (!canBeCollateral)
      return { text: "Not Collateral", color: "text-[#A1A1AA]" };
    if (isolationModeEnabled)
      return { text: "Isolation Mode", color: "text-yellow-500" };
    if (collateralizationStatus === "enabled")
      return { text: "Enabled", color: "text-green-500" };
    return { text: "Disabled", color: "text-[#A1A1AA]" };
  };

  const collateralDisplay = getCollateralStatusDisplay();

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
      return;
    }

    // Check if we have valid decimals
    if (!tokenDecimals || tokenDecimals <= 0) {
      toast.error("Token decimals missing", {
        description: `Invalid token decimals for ${tokenSymbol}: ${tokenDecimals}`,
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
            Supply {tokenSymbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-[#A1A1AA]">
                Amount
              </label>
              <div className="flex items-center gap-2">
                <div className="text-xs text-[#A1A1AA]">
                  Balance: {balance} {tokenSymbol}
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
                value={supplyAmount}
                onChange={handleAmountChange}
                disabled={isLoading || isSubmitting}
                className={cn(
                  "pr-16 bg-[#27272A] border-[#3F3F46] text-[#FAFAFA] placeholder:text-[#71717A] text-lg",
                  !isAmountValid && supplyAmount && "border-red-500",
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="text-sm text-[#A1A1AA]">{tokenSymbol}</span>
              </div>
            </div>

            {/* USD Value */}
            <div className="mt-2 text-xs text-[#71717A]">
              ${supplyAmountUSD.toFixed(2)} USD
            </div>

            {/* Validation error */}
            {!isAmountValid && supplyAmount && (
              <div className="flex items-center gap-1 mt-2">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-red-500 text-xs">Enter a valid amount</p>
              </div>
            )}
          </div>

          {/* APY and Asset Information */}
          <div className="space-y-3">
            {/* APY Information */}
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Info className="h-4 w-4 text-green-500" />
              <span className="text-sm text-[#FAFAFA]">
                Supply APY:{" "}
                <span className="text-green-500 font-semibold">
                  {supplyAPY}
                </span>
              </span>
            </div>

            {/* Isolation Mode Warning */}
            {isolationModeEnabled && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <div className="text-sm">
                  <div className="text-[#FAFAFA] font-medium">
                    Isolation Mode Active
                  </div>
                  <div className="text-[#A1A1AA] text-xs">
                    You can only borrow stablecoins with this asset as
                    collateral
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Asset Details */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#A1A1AA]">Asset</span>
              <div className="flex items-center gap-2">
                {imagePath ? (
                  <Image
                    src={imagePath}
                    alt={tokenSymbol}
                    width={16}
                    height={16}
                    className="rounded-full"
                    onError={() => setHasImageError(true)}
                  />
                ) : (
                  <div className="bg-blue-500 rounded-full flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {fallbackIcon}
                    </span>
                  </div>
                )}
                <span className="text-[#FAFAFA]">{tokenName}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A1AA]">Can be Collateral</span>
              <span className={collateralDisplay.color}>
                {collateralDisplay.text}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#A1A1AA]">Current Health Factor</span>
              <span className={getHealthFactorColor(currentHealthFactor)}>
                {currentHealthFactor.toFixed(2)}
              </span>
            </div>

            {/* New Health Factor (only show if there's a meaningful change) */}
            {supplyAmountNum > 0 &&
              Math.abs(healthFactorChange) > 0.01 &&
              canBeCollateral && (
                <div className="flex justify-between">
                  <span className="text-[#A1A1AA]">New Health Factor</span>
                  <span className={getHealthFactorColor(newHealthFactor)}>
                    {newHealthFactor.toFixed(2)}
                    <span className="text-green-500 ml-1">
                      (+{healthFactorChange.toFixed(2)})
                    </span>
                  </span>
                </div>
              )}
          </div>

          {/* Supply Button */}
          <Button
            onClick={handleSupply}
            disabled={!isFormValid}
            className="w-full bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Processing...
              </div>
            ) : isLoading ? (
              "Loading..."
            ) : (
              <>
                Supply{" "}
                {supplyAmountNum > 0
                  ? `${formatNumber(supplyAmountNum, 4)} `
                  : ""}
                {tokenSymbol}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-[#71717A] text-center">
            By supplying, you agree to Aave&apos;s terms and conditions. Your
            supply will start earning yield immediately.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export {
  SupplyModal,
  Dialog as SupplyDialog,
  DialogTrigger as SupplyDialogTrigger,
  DialogPortal as SupplyDialogPortal,
  DialogOverlay as SupplyDialogOverlay,
  DialogContent as SupplyDialogContent,
  DialogHeader as SupplyDialogHeader,
  DialogTitle as SupplyDialogTitle,
  DialogClose as SupplyDialogClose,
};
