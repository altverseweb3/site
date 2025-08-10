"use client";

import Image from "next/image";
import { AlertCircle, Shield, ShieldOff } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useAaveInteract } from "@/utils/aave/interact";
import { toast } from "sonner";
import { useState, useEffect, FC, ReactNode } from "react";
import { getChainName, SupportedChainId } from "@/config/aave";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import {
  getHealthFactorColor,
  calculateUserSupplyPositionsUSD,
  calculateUserBorrowPositionsUSD,
} from "@/utils/aave/utils";
import { UserPosition, UserBorrowPosition } from "@/types/aave";
import { calculateUserMetrics } from "@/utils/aave/metricsCalculations";
import { formatHealthFactor } from "@/utils/formatters";
import {
  AmberButton,
  GrayButton,
} from "@/components/ui/lending/SupplyButtonComponents";

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
  tokenPrice?: number; // Current token price in USD
  liquidationThreshold?: number; // LTV for this asset (e.g., 0.85 = 85%)
  onCollateralChange?: (enabled: boolean) => Promise<boolean>;
  children: ReactNode; // The trigger element
  isLoading?: boolean; // Loading state from parent
  tokenAddress?: string; // Token contract address
  tokenDecimals?: number; // Token decimals
  userSupplyPositions?: UserPosition[];
  userBorrowPositions?: UserBorrowPosition[];
  oraclePrices?: Record<string, number>;
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
  tokenPrice = 1,
  liquidationThreshold = 0.85, // Default 85% LTV
  onCollateralChange = async () => true,
  children,
  isLoading = false,
  tokenAddress = "", // Token contract address
  userSupplyPositions = [],
  userBorrowPositions = [],
  oraclePrices = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [acceptHighRisk, setAcceptHighRisk] = useState(false);

  const { evmNetwork, isEvmConnected } = useWalletConnection();
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const { setCollateral } = useAaveInteract();

  const chainName = getChainName(chainId);
  const fallbackIcon = tokenSymbol.charAt(0).toUpperCase();

  const getImagePath = () => {
    if (!tokenIcon || tokenIcon === "unknown.png" || hasImageError) {
      return null;
    }
    return `/tokens/${chainName}/pngs/${tokenIcon}`;
  };

  const imagePath = getImagePath();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (isOpen) {
      setAcceptHighRisk(false);
    }
  }, [isOpen, isMounted]);
  if (!isMounted) {
    return null;
  }

  const suppliedBalanceUSDNum = parseFloat(suppliedBalanceUSD) || 0;
  const calculatedUSDValue = parseFloat(suppliedBalance) * tokenPrice;
  const actualUSDValue =
    suppliedBalanceUSDNum > 0 ? suppliedBalanceUSDNum : calculatedUSDValue;

  const isEnabling = !isCurrentlyCollateral;
  const actionText = isEnabling ? "Enable" : "Disable";

  const userSupplyPositionsUSD = calculateUserSupplyPositionsUSD(
    userSupplyPositions,
    oraclePrices,
  );

  const userBorrowPositionsUSD = calculateUserBorrowPositionsUSD(
    userBorrowPositions,
    oraclePrices,
  );

  const currentMetrics = calculateUserMetrics(
    userSupplyPositionsUSD,
    userBorrowPositionsUSD,
  );

  let newHealthFactor = currentMetrics.healthFactor || Infinity;
  let newLTV = currentMetrics.currentLTV;
  let isHighRiskTransaction = false;

  if (currentMetrics.totalDebtUSD > 0) {
    const newTotalCollateral = isCurrentlyCollateral
      ? Math.max(0, currentMetrics.totalCollateralUSD - actualUSDValue)
      : currentMetrics.totalCollateralUSD + actualUSDValue;

    const newWeightedCollateral = newTotalCollateral * liquidationThreshold;
    newHealthFactor = newWeightedCollateral / currentMetrics.totalDebtUSD;
    newLTV =
      newTotalCollateral > 0
        ? (currentMetrics.totalDebtUSD / newTotalCollateral) * 100
        : currentMetrics.totalDebtUSD > 0
          ? 100
          : 0;

    isHighRiskTransaction = newHealthFactor < 1.2;
  }

  const isFormValid =
    !isLoading &&
    !isSubmitting &&
    canBeCollateral &&
    (!isHighRiskTransaction || acceptHighRisk);

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
            {actionText.toLowerCase()} {tokenSymbol} collateral
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Position Info */}
          <div className="p-4 bg-[#27272A] rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A1A1AA]">supplied amount</span>
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
              <span className="text-sm text-[#A1A1AA]">supply APY</span>
              <span className="text-sm text-green-500">{supplyAPY}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A1A1AA]">current status</span>
              <span
                className={
                  isCurrentlyCollateral ? "text-green-500" : "text-[#A1A1AA]"
                }
              >
                {isCurrentlyCollateral
                  ? "collateral enabled"
                  : "collateral disabled"}
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
                    enable as collateral
                  </div>
                  <div className="text-[#A1A1AA] text-xs">
                    this asset will be used to back your borrowing power
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <ShieldOff className="h-4 w-4 text-orange-500" />
                <div className="text-sm">
                  <div className="text-[#FAFAFA] font-medium">
                    disable as collateral
                  </div>
                  <div className="text-[#A1A1AA] text-xs">
                    this asset will no longer back your borrowing power
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
                    isolation mode active
                  </div>
                  <div className="text-[#A1A1AA] text-xs">
                    you can only borrow stablecoins with this asset as
                    collateral
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Health Factor Display - Same style as BorrowModal */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
                <div className="text-xs text-[#A1A1AA] mb-1">health factor</div>
                <div
                  className={cn(
                    "text-lg font-semibold font-mono",
                    getHealthFactorColor(
                      currentMetrics.healthFactor || Infinity,
                    ),
                  )}
                >
                  {formatHealthFactor(currentMetrics.healthFactor)}
                </div>
              </div>

              {currentMetrics.totalDebtUSD > 0 && (
                <div className="text-[#71717A]">→</div>
              )}

              {currentMetrics.totalDebtUSD > 0 && (
                <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
                  <div className="text-xs text-[#A1A1AA] mb-1">
                    new health factor
                  </div>
                  <div
                    className={cn(
                      "text-lg font-semibold font-mono",
                      getHealthFactorColor(newHealthFactor),
                    )}
                  >
                    {formatHealthFactor(newHealthFactor)}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
                <div className="text-xs text-[#A1A1AA] mb-1">current LTV</div>
                <div
                  className={cn(
                    "text-lg font-semibold font-mono",
                    currentMetrics.currentLTV <
                      currentMetrics.liquidationThreshold * 0.7
                      ? "text-green-500"
                      : currentMetrics.currentLTV <
                          currentMetrics.liquidationThreshold * 0.9
                        ? "text-amber-500"
                        : "text-red-500",
                  )}
                >
                  {currentMetrics.currentLTV.toFixed(2)}%
                </div>
              </div>

              {currentMetrics.totalDebtUSD > 0 && (
                <div className="text-[#71717A]">→</div>
              )}

              {currentMetrics.totalDebtUSD > 0 && (
                <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
                  <div className="text-xs text-[#A1A1AA] mb-1">new LTV</div>
                  <div
                    className={cn(
                      "text-lg font-semibold font-mono",
                      newLTV < currentMetrics.liquidationThreshold * 0.7
                        ? "text-green-500"
                        : newLTV < currentMetrics.liquidationThreshold * 0.9
                          ? "text-amber-500"
                          : "text-red-500",
                    )}
                  >
                    {newLTV.toFixed(2)}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Asset Details */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#A1A1AA]">asset</span>
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
              <span className="text-[#A1A1AA]">liquidation threshold</span>
              <span className="text-[#FAFAFA]">
                {(liquidationThreshold * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* High Risk Warning with Acceptance Checkbox */}
          {isHighRiskTransaction && (
            <div
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                newHealthFactor < 1.1
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-yellow-500/10 border border-yellow-500/20",
              )}
            >
              <AlertCircle
                className={cn(
                  "h-4 w-4",
                  newHealthFactor < 1.1 ? "text-red-500" : "text-yellow-500",
                )}
              />
              <div className="text-sm">
                <div
                  className={cn(
                    "font-medium",
                    newHealthFactor < 1.1 ? "text-red-500" : "text-yellow-500",
                  )}
                >
                  {newHealthFactor < 1.1
                    ? "liquidation risk"
                    : "high risk transaction"}
                </div>
                <div className="text-[#A1A1AA] text-xs">
                  This {isEnabling ? "enabling" : "disabling"} will set your
                  health factor to {formatHealthFactor(newHealthFactor)}
                  {newHealthFactor < 1.0 && " - immediate liquidation risk"}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="acceptHighRiskCollateral"
                    checked={acceptHighRisk}
                    onChange={(e) => setAcceptHighRisk(e.target.checked)}
                    className="w-3 h-3 text-red-500 bg-[#27272A] border border-red-500/50 rounded-sm focus:ring-red-500/30 focus:ring-1 accent-red-500"
                  />
                  <label
                    htmlFor="acceptHighRiskCollateral"
                    className="text-xs text-[#A1A1AA] cursor-pointer"
                  >
                    {newHealthFactor < 1.1
                      ? "I understand the liquidation risk and accept it"
                      : "I accept the high risk of this transaction"}
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <div className="flex-1">
              <AmberButton
                onClick={handleCollateralToggle}
                disabled={!isFormValid}
                className={cn(
                  "h-8 py-2",
                  !isFormValid ? "opacity-50 cursor-not-allowed" : "",
                  isHighRiskTransaction
                    ? "border-red-500/25 bg-red-500/10 hover:bg-red-500/20"
                    : "",
                )}
              >
                <span
                  className={cn(isHighRiskTransaction ? "text-red-500" : "")}
                >
                  {isSubmitting
                    ? `${actionText.toLowerCase()}...`
                    : isHighRiskTransaction && !acceptHighRisk
                      ? "high risk - blocked"
                      : isHighRiskTransaction && acceptHighRisk
                        ? `high risk ${actionText.toLowerCase()}`
                        : !canBeCollateral
                          ? "not eligible"
                          : `${actionText.toLowerCase()} collateral`}
                </span>
              </AmberButton>
            </div>

            <DialogClose asChild>
              <div className="flex-1">
                <GrayButton className="h-8 py-2">cancel</GrayButton>
              </div>
            </DialogClose>
          </div>

          <p className="text-xs text-[#71717A] text-center">
            {isEnabling
              ? "enabling this asset as collateral will increase your borrowing power."
              : "disabling this asset as collateral will reduce your borrowing power."}
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
