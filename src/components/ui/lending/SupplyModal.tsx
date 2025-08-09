"use client";

import { AlertCircle, Info } from "lucide-react";
import { TokenImage } from "@/components/ui/TokenImage";
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
import {
  AmberButton,
  GrayButton,
} from "@/components/ui/lending/SupplyButtonComponents";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useAaveInteract } from "@/utils/aave/interact";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { toast } from "sonner";
import { useState, useEffect, FC, ReactNode, ChangeEvent } from "react";
import { SupportedChainId } from "@/config/aave";
import { getChainByChainId } from "@/config/chains";
import type { Token, Chain } from "@/types/web3";

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
  currentLTV?: number; // Current loan-to-value ratio
  onSupply?: (amount: string) => Promise<boolean>;
  children: ReactNode; // The trigger element
  isLoading?: boolean; // Loading state from parent
  tokenAddress?: string; // Token contract address
  tokenDecimals?: number; // Token decimals
  maxLTV?: number; // Maximum LTV for this asset
  liquidationBonus?: number; // Liquidation bonus for this asset
}

const SupplyModal: FC<SupplyModalProps> = ({
  tokenSymbol = "USDC",
  tokenName = "USD Coin",
  tokenIcon = "usdc.png",
  chainId = 1,
  balance = "1,234.56",
  supplyAPY = "3.53%",
  collateralizationStatus = "enabled",
  isolationModeEnabled = false,
  canBeCollateral = true,
  tokenPrice = 1, // Default to $1 if not provided
  onSupply = async () => true,
  children,
  isLoading = false,
  tokenAddress = "", // Token contract address
  tokenDecimals = 18, // Token decimals
}) => {
  const [supplyAmount, setSupplyAmount] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Get wallet connection info
  const { evmNetwork, isEvmConnected } = useWalletConnection();
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const { supply } = useAaveInteract();

  // Create Token and Chain objects for TokenImage component
  const token: Token = {
    id: tokenAddress || `${tokenSymbol}-${chainId}`,
    name: tokenName,
    ticker: tokenSymbol,
    icon: tokenIcon || "unknown.png",
    address: tokenAddress,
    decimals: tokenDecimals,
    chainId: chainId,
    stringChainId: chainId.toString(),
  };

  const chain: Chain = getChainByChainId(chainId);

  // Handle client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
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

  // Enhanced validation
  const isAmountValid = supplyAmountNum > 0;
  const isFormValid =
    isAmountValid && !isLoading && !isSubmitting;

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
      const currentChainId = evmNetwork?.chainId
        ? typeof evmNetwork.chainId === "string"
          ? parseInt(evmNetwork.chainId, 10)
          : evmNetwork.chainId
        : 1; // Default to Ethereum mainnet

      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();

      // Show initial toast
      const toastId = toast.loading(
        `Supplying ${supplyAmount} ${tokenSymbol}`,
        {
          description: "Approve token transfer and supply to Aave",
        },
      );

      // Call the real Aave supply function
      const result = await supply({
        tokenAddress,
        amount: supplyAmount,
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId: currentChainId as SupportedChainId,
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
    const adjustedMax = isNativeToken ? Math.max(0, maxBalance) : maxBalance;
    setSupplyAmount(adjustedMax.toString());
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
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
            <div className="rounded-full overflow-hidden">
              <TokenImage token={token} chain={chain} size="sm" />
            </div>
            supply {tokenSymbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-[#A1A1AA]">
                amount
              </label>
              <div className="flex items-center gap-2">
                <div className="text-xs text-[#A1A1AA]">
                  balance: {balance} {tokenSymbol}
                </div>
                <button
                  onClick={handleMaxClick}
                  disabled={isLoading || isSubmitting}
                  className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-500 hover:text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                >
                  max
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
                <p className="text-red-500 text-xs">enter a valid amount</p>
              </div>
            )}
          </div>

          {/* APY and Asset Information */}
          <div className="space-y-3">
            {/* APY Information */}
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Info className="h-4 w-4 text-green-500" />
              <span className="text-sm text-[#FAFAFA]">
                supply APY:{" "}
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

          {/* Asset Details */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#A1A1AA]">asset</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full overflow-hidden">
                  <TokenImage token={token} chain={chain} size="sm" />
                </div>
                <span className="text-[#FAFAFA]">{tokenName}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A1AA]">can be collateral</span>
              <span className={collateralDisplay.color}>
                {collateralDisplay.text}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <div className="flex-1">
              <AmberButton
                onClick={handleSupply}
                disabled={!isFormValid}
                className={cn(
                  "h-8 py-2",
                  !isFormValid ? "opacity-50 cursor-not-allowed" : "",
                )}
              >
                {isSubmitting ? "supplying..." : "supply"}
              </AmberButton>
            </div>

            <DialogClose asChild>
              <div className="flex-1">
                <GrayButton className="h-8 py-2">cancel</GrayButton>
              </div>
            </DialogClose>
          </div>

          <p className="text-xs text-[#71717A] text-center">
            by supplying, you agree to Aave&apos;s terms and conditions. your
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