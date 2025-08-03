"use client";

import Image from "next/image";
import { AlertCircle, ArrowRight, Shield, ShieldOff } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useAaveInteract } from "@/utils/aave/interact";
import { toast } from "sonner";
import { useState, useEffect, FC, ReactNode } from "react";
import { chainNames, SupportedChainId } from "@/config/aave";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { getHealthFactorColor } from "@/utils/aave/utils";

// Health Factor Calculator Utility
const calculateNewHealthFactorForCollateral = (
  currentTotalCollateralUSD: number,
  currentTotalDebtUSD: number,
  assetCollateralUSD: number,
  liquidationThreshold: number,
  isEnabling: boolean,
): number => {
  if (currentTotalDebtUSD === 0) {
    return 999; // No debt means very high health factor
  }

  // If enabling: add to collateral, if disabling: subtract from collateral
  const newTotalCollateral = isEnabling
    ? currentTotalCollateralUSD + assetCollateralUSD
    : currentTotalCollateralUSD - assetCollateralUSD;

  const adjustedCollateral =
    Math.max(0, newTotalCollateral) * liquidationThreshold;

  return adjustedCollateral / currentTotalDebtUSD;
};

// Main Collateral Modal Component
interface CollateralModalProps {
  tokenSymbol?: string;
  tokenName?: string;
  tokenIcon?: string; // Token icon filename (e.g., "usdc.png")
  chainId?: number; // Chain ID for token image path
  suppliedBalance?: string; // Amount user has supplied
  suppliedBalanceUSD?: string; // USD value of supplied balance
  supplyAPY?: string;
  isCurrentlyCollateral?: boolean; // Current collateral status
  isolationModeEnabled?: boolean; // Whether the asset is in isolation mode
  canBeCollateral?: boolean; // Whether the asset can be used as collateral
  healthFactor?: string;
  tokenPrice?: number; // Current token price in USD
  liquidationThreshold?: number; // LTV for this asset (e.g., 0.85 = 85%)
  totalCollateralUSD?: number; // Current total collateral in USD
  totalDebtUSD?: number; // Current total debt in USD
  onCollateralChange?: (enabled: boolean) => Promise<boolean>;
  children: ReactNode; // The trigger element
  isLoading?: boolean; // Loading state from parent
  tokenAddress?: string; // Token contract address
  tokenDecimals?: number; // Token decimals
}

const CollateralModal: FC<CollateralModalProps> = ({
  tokenSymbol = "USDC",
  tokenName = "USD Coin",
  tokenIcon = "usdc.png",
  chainId = 1,
  suppliedBalance = "0",
  suppliedBalanceUSD = "0.00",
  supplyAPY = "3.53%",
  isCurrentlyCollateral = false,
  isolationModeEnabled = false,
  canBeCollateral = true,
  healthFactor = "1.24",
  liquidationThreshold = 0.85, // Default 85% LTV
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  onCollateralChange = async () => true,
  children,
  isLoading = false,
  tokenAddress = "", // Token contract address
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  const { evmNetwork, isEvmConnected } = useWalletConnection();
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const { setCollateral } = useAaveInteract();

  const chainName = chainNames[chainId] || "ethereum";
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

  // Don't render on server to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  // Calculate values
  const currentHealthFactor = parseFloat(healthFactor) || 0;
  const suppliedBalanceUSDNum = parseFloat(suppliedBalanceUSD) || 0;

  // Determine action (enabling or disabling collateral)
  const isEnabling = !isCurrentlyCollateral;
  const actionText = isEnabling ? "Enable" : "Disable";
  const actionIcon = isEnabling ? Shield : ShieldOff;
  const ActionIcon = actionIcon;

  // Calculate new health factor
  const newHealthFactor =
    totalDebtUSD > 0
      ? calculateNewHealthFactorForCollateral(
          totalCollateralUSD,
          totalDebtUSD,
          suppliedBalanceUSDNum,
          liquidationThreshold,
          isEnabling,
        )
      : currentHealthFactor;

  const healthFactorChange = newHealthFactor - currentHealthFactor;

  // Check if action would be dangerous (health factor below 1.1)
  const isDangerous = !isEnabling && newHealthFactor < 1.1 && totalDebtUSD > 0;
  const isFormValid = !isLoading && !isSubmitting && !isDangerous;

  const handleCollateralToggle = async () => {
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

    // Check if asset can be collateral
    if (!canBeCollateral) {
      toast.error("Asset cannot be used as collateral", {
        description: `${tokenSymbol} is not eligible for use as collateral`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const currentChainId = evmNetwork?.chainId
        ? typeof evmNetwork.chainId === "string"
          ? parseInt(evmNetwork.chainId, 10)
          : evmNetwork.chainId
        : 1; // Default to Ethereum mainnet

      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();

      // Show initial toast
      const toastId = toast.loading(
        `${actionText} collateral for ${tokenSymbol}`,
        {
          description: `${actionText} ${tokenSymbol} as collateral`,
        },
      );

      // Call the real Aave collateral toggle function
      const result = await setCollateral({
        tokenAddress,
        useAsCollateral: isEnabling,
        tokenSymbol,
        userAddress,
        chainId: currentChainId as SupportedChainId,
      });

      if (result.success) {
        toast.success(
          `Successfully ${isEnabling ? "enabled" : "disabled"} ${tokenSymbol} as collateral`,
          {
            id: toastId,
            description: `Transaction: ${result.txHash?.slice(0, 10)}...`,
          },
        );

        // Close modal
        setIsOpen(false);

        // Call the optional callback
        if (onCollateralChange) {
          await onCollateralChange(isEnabling);
        }
      } else {
        toast.error(`Failed to ${actionText.toLowerCase()} collateral`, {
          id: toastId,
          description: result.error || "Transaction failed",
        });
      }
    } catch (error: unknown) {
      toast.error(`Failed to ${actionText.toLowerCase()} collateral`, {
        description: (error as Error).message || "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
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
            {actionText} {tokenSymbol} Collateral
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Position Info */}
          <div className="p-4 bg-[#27272A] rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A1A1AA]">Supplied Amount</span>
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
              <span className="text-sm text-[#A1A1AA]">Current Status</span>
              <span
                className={
                  isCurrentlyCollateral ? "text-green-500" : "text-[#A1A1AA]"
                }
              >
                {isCurrentlyCollateral
                  ? "Collateral Enabled"
                  : "Collateral Disabled"}
              </span>
            </div>
          </div>

          {/* Action Description */}
          <div className="space-y-3">
            {isEnabling ? (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Shield className="h-4 w-4 text-green-500" />
                <div className="text-sm">
                  <div className="text-[#FAFAFA] font-medium">
                    Enable as Collateral
                  </div>
                  <div className="text-[#A1A1AA] text-xs">
                    This asset will be used to back your borrowing power
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <ShieldOff className="h-4 w-4 text-orange-500" />
                <div className="text-sm">
                  <div className="text-[#FAFAFA] font-medium">
                    Disable as Collateral
                  </div>
                  <div className="text-[#A1A1AA] text-xs">
                    This asset will no longer back your borrowing power
                  </div>
                </div>
              </div>
            )}

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

            {/* Danger Warning */}
            {isDangerous && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <div className="text-sm">
                  <div className="text-red-500 font-medium">Risk Warning</div>
                  <div className="text-[#A1A1AA] text-xs">
                    Disabling this collateral would reduce your health factor
                    below 1.1, putting you at risk of liquidation
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Health Factor Impact */}
          {totalDebtUSD > 0 && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Current Health Factor</span>
                <span className={getHealthFactorColor(currentHealthFactor)}>
                  {currentHealthFactor.toFixed(2)}
                </span>
              </div>

              {Math.abs(healthFactorChange) > 0.01 && (
                <div className="flex justify-between">
                  <span className="text-[#A1A1AA]">New Health Factor</span>
                  <span className={getHealthFactorColor(newHealthFactor)}>
                    {newHealthFactor.toFixed(2)}
                    <span
                      className={
                        healthFactorChange > 0
                          ? "text-green-500"
                          : "text-red-500"
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
              <span className="text-[#A1A1AA]">Liquidation Threshold</span>
              <span className="text-[#FAFAFA]">
                {(liquidationThreshold * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleCollateralToggle}
            disabled={!isFormValid}
            className={cn(
              "w-full disabled:opacity-50",
              isEnabling
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-orange-600 text-white hover:bg-orange-700",
              isDangerous && "bg-red-600 hover:bg-red-700",
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
                Too Risky
              </>
            ) : (
              <>
                <ActionIcon className="h-4 w-4 mr-2" />
                {actionText} as Collateral
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-[#71717A] text-center">
            {isEnabling
              ? "Enabling this asset as collateral will increase your borrowing power."
              : "Disabling this asset as collateral will reduce your borrowing power."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export {
  CollateralModal,
  Dialog as CollateralDialog,
  DialogTrigger as CollateralDialogTrigger,
  DialogPortal as CollateralDialogPortal,
  DialogOverlay as CollateralDialogOverlay,
  DialogContent as CollateralDialogContent,
  DialogHeader as CollateralDialogHeader,
  DialogTitle as CollateralDialogTitle,
  DialogClose as CollateralDialogClose,
};
