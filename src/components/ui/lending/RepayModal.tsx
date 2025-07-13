"use client";

import { AlertCircle, Info, ArrowRight } from "lucide-react";
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
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { AaveTransactions, RateMode } from "@/utils/aave/interact";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { ethers } from "ethers";
import { toast } from "sonner";
import { useState, useEffect, FC, ReactNode, ChangeEvent } from "react";
import { chainNames, SupportedChainId } from "@/config/aave";
import type { Token, Chain, MayanChainName } from "@/types/web3";
import { Network, WalletType } from "@/types/web3";

// Health Factor Calculator for Repayment
const calculateNewHealthFactorForRepay = (
  currentTotalCollateralUSD: number,
  currentTotalDebtUSD: number,
  repayAmountUSD: number,
  liquidationThreshold: number,
): number => {
  const newTotalDebt = Math.max(0, currentTotalDebtUSD - repayAmountUSD);

  if (newTotalDebt === 0) {
    return 999; // No debt means very high health factor
  }

  const adjustedCollateral = currentTotalCollateralUSD * liquidationThreshold;
  return adjustedCollateral / newTotalDebt;
};

// Health Factor Color Helper
const getHealthFactorColor = (healthFactor: number): string => {
  if (healthFactor >= 2) return "text-green-500";
  if (healthFactor >= 1.5) return "text-yellow-500";
  if (healthFactor >= 1.1) return "text-orange-500";
  return "text-red-500";
};

// Main Repay Modal Component
interface RepayModalProps {
  tokenSymbol?: string;
  tokenName?: string;
  tokenIcon?: string;
  chainId?: number;
  walletBalance?: string; // User's wallet balance of the token
  currentDebt?: string; // User's current debt amount
  debtUSD?: string; // Current debt in USD
  borrowAPY?: string; // Current borrow APY
  stableDebt?: string; // Stable debt amount
  variableDebt?: string; // Variable debt amount
  healthFactor?: string;
  tokenPrice?: number;
  liquidationThreshold?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  onRepay?: (amount: string, rateMode: RateMode) => Promise<boolean>;
  children: ReactNode;
  isLoading?: boolean;
  tokenAddress?: string;
  tokenDecimals?: number;
}

const RepayModal: FC<RepayModalProps> = ({
  tokenSymbol = "USDC",
  tokenName = "USD Coin",
  tokenIcon = "usdc.png",
  chainId = 1,
  walletBalance = "0.00",
  currentDebt = "0.00",
  debtUSD = "0.00",
  borrowAPY = "0.00%",
  stableDebt = "0.00",
  variableDebt = "0.00",
  healthFactor = "1.24",
  tokenPrice = 1,
  liquidationThreshold = 0.85,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  onRepay = async () => true,
  children,
  isLoading = false,
  tokenAddress = "",
  tokenDecimals = 18,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [repayMode, setRepayMode] = useState<RateMode>(RateMode.Variable); // Default to variable

  const { isEvmConnected, evmNetwork } = useWalletConnection();

  // Determine the appropriate repay mode based on debt composition
  useEffect(() => {
    const variableDebtNum = parseFloat(variableDebt) || 0;
    const stableDebtNum = parseFloat(stableDebt) || 0;

    // Default to variable if there's more variable debt, otherwise stable
    if (variableDebtNum >= stableDebtNum && variableDebtNum > 0) {
      setRepayMode(RateMode.Variable);
    } else if (stableDebtNum > 0) {
      setRepayMode(RateMode.Stable);
    }
  }, [variableDebt, stableDebt]);

  // Handle amount input change
  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setRepayAmount(value);
    }
  };

  // Handle max button click
  const handleMaxClick = () => {
    // Max should be the full debt amount, not limited by wallet balance
    const maxDebtAmount = parseFloat(currentDebt) || 0;
    setRepayAmount(maxDebtAmount.toString());
  };

  // Handle client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isMounted) return;

    if (isOpen) {
      setRepayAmount("");
    } else {
      setRepayAmount("");
    }
  }, [isOpen, isMounted]);

  // Don't render on server to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  // Calculate USD value and health factor changes
  const repayAmountNum = parseFloat(repayAmount) || 0;
  const repayAmountUSD = repayAmountNum * tokenPrice;
  const currentHealthFactor = parseFloat(healthFactor) || 0;

  // Calculate new health factor after repayment
  const newHealthFactor =
    totalDebtUSD > 0
      ? calculateNewHealthFactorForRepay(
          totalCollateralUSD,
          totalDebtUSD,
          repayAmountUSD,
          liquidationThreshold,
        )
      : currentHealthFactor;

  const healthFactorChange = newHealthFactor - currentHealthFactor;

  // Validation
  const maxDebtAmount = parseFloat(currentDebt) || 0;
  const walletBalanceNum = parseFloat(walletBalance) || 0;

  const isAmountValid = repayAmountNum > 0 && repayAmountNum <= maxDebtAmount;
  const hasInsufficientBalance = repayAmountNum > walletBalanceNum;
  const isFormValid = isAmountValid && !isLoading && !isSubmitting;

  // Get debt type display
  const getDebtTypeDisplay = () => {
    const variableDebtNum = parseFloat(variableDebt) || 0;
    const stableDebtNum = parseFloat(stableDebt) || 0;

    if (variableDebtNum > 0 && stableDebtNum > 0) {
      return `Mixed (${repayMode === RateMode.Variable ? "repaying variable" : "repaying stable"})`;
    } else if (variableDebtNum > 0) {
      return "Variable";
    } else if (stableDebtNum > 0) {
      return "Stable";
    }
    return "Variable";
  };

  const handleRepay = async () => {
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
        : 1;

      // Get signer from window.ethereum
      if (!window.ethereum) {
        throw new Error("No wallet detected");
      }

      const ethereum = window.ethereum as {
        request: (args: {
          method: string;
          params?: unknown[];
        }) => Promise<unknown>;
        on?: (event: string, callback: (...args: unknown[]) => void) => void;
        removeListener?: (
          event: string,
          callback: (...args: unknown[]) => void,
        ) => void;
      };

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      console.log(
        `💳 Repaying ${repayAmount} ${tokenSymbol} (${getDebtTypeDisplay()})...`,
      );

      // Call the Aave repay transaction
      const result = await AaveTransactions.repayAsset({
        tokenAddress,
        amount: repayAmount,
        rateMode: repayMode,
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId: currentChainId as SupportedChainId,
        signer,
      });

      if (result.success) {
        toast.success("Repayment successful!", {
          description: `Successfully repaid ${repayAmount} ${tokenSymbol}`,
          action: result.txHash
            ? {
                label: "View Transaction",
                onClick: () =>
                  window.open(
                    `https://etherscan.io/tx/${result.txHash}`,
                    "_blank",
                  ),
              }
            : undefined,
        });

        // Call the parent onRepay callback
        await onRepay(repayAmount, repayMode);

        // Close modal and reset form
        setIsOpen(false);
        setRepayAmount("");
      } else {
        toast.error("Repayment failed", {
          description: result.error || "Unknown error occurred",
        });
      }
    } catch (error) {
      console.error("Repay error:", error);
      toast.error("Repayment failed", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Token and Chain objects for TokenImage
  const chainName = chainNames[chainId] || "ethereum";

  const token: Token = {
    id: tokenAddress,
    name: tokenName,
    ticker: tokenSymbol,
    icon: tokenIcon,
    address: tokenAddress,
    decimals: tokenDecimals,
    chainId: chainId,
    stringChainId: chainId.toString(),
  };

  const chain: Chain = {
    id: chainName,
    name: chainName,
    chainName: chainName,
    mayanName: chainName as MayanChainName,
    alchemyNetworkName: Network.ETH_MAINNET,
    nativeGasToken: {
      symbol: "ETH",
      address: "",
      decimals: 18,
    },
    icon: "",
    brandedIcon: "",
    chainTokenSymbol: "ETH",
    currency: "USD",
    backgroundColor: "",
    fontColor: "",
    chainId: chainId,
    decimals: 18,
    l2: false,
    gasDrop: 0,
    walletType: WalletType.REOWN_EVM,
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="sm:max-w-md bg-[#131313] border-[#232326] text-white">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <TokenImage token={token} chain={chain} size="sm" />
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Repay {tokenSymbol}
                </DialogTitle>
                <p className="text-sm text-gray-400">{tokenName}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Debt Info */}
            <div className="space-y-3 p-4 bg-[#1A1A1A] rounded-lg border border-[#232326]">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Current Debt</span>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {currentDebt} {tokenSymbol}
                  </div>
                  <div className="text-xs text-gray-400">${debtUSD}</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Debt Type</span>
                <span className="text-sm text-red-400">
                  {getDebtTypeDisplay()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Borrow APY</span>
                <span className="text-sm text-red-400">{borrowAPY}</span>
              </div>
            </div>

            {/* Repay Amount Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-300">
                  Repay Amount
                </label>
                <span className="text-xs text-gray-400">
                  Wallet: {walletBalance} {tokenSymbol}
                </span>
              </div>

              <div className="relative">
                <Input
                  type="text"
                  placeholder="0.00"
                  value={repayAmount}
                  onChange={handleAmountChange}
                  className="bg-[#1A1A1A] border-[#232326] text-white pr-16"
                />
                <button
                  type="button"
                  onClick={handleMaxClick}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  MAX
                </button>
              </div>

              {repayAmountNum > 0 && (
                <div className="text-xs text-gray-400">
                  ≈ ${repayAmountUSD.toFixed(2)}
                </div>
              )}

              {/* Validation Messages */}
              {repayAmount && !isAmountValid && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  {repayAmountNum > maxDebtAmount
                    ? `Amount exceeds debt (${maxDebtAmount.toFixed(6)} ${tokenSymbol})`
                    : "Please enter a valid amount"}
                </div>
              )}

              {/* Insufficient balance warning (but don't prevent submission) */}
              {repayAmount && isAmountValid && hasInsufficientBalance && (
                <div className="flex items-center gap-2 text-yellow-400 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  Insufficient wallet balance (have:{" "}
                  {walletBalanceNum.toFixed(6)} {tokenSymbol})
                </div>
              )}
            </div>

            {/* Health Factor Impact */}
            {totalDebtUSD > 0 && repayAmountNum > 0 && (
              <div className="space-y-3 p-4 bg-[#1A1A1A] rounded-lg border border-[#232326]">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">
                    Health Factor Impact
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Current</span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      getHealthFactorColor(currentHealthFactor),
                    )}
                  >
                    {currentHealthFactor.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-center text-gray-400">
                  <ArrowRight className="h-4 w-4" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">After Repayment</span>
                  <div className="text-right">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        getHealthFactorColor(newHealthFactor),
                      )}
                    >
                      {newHealthFactor.toFixed(2)}
                    </span>
                    {healthFactorChange !== 0 && (
                      <div className="text-xs text-green-400">
                        +{healthFactorChange.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="flex-1 border-[#232326] text-gray-300 hover:bg-[#1A1A1A]"
                >
                  Cancel
                </Button>
              </DialogClose>

              <Button
                onClick={handleRepay}
                disabled={!isFormValid}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Repaying..." : `Repay ${tokenSymbol}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default RepayModal;
