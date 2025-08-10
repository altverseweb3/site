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
import {
  BlueButton,
  GrayButton,
} from "@/components/ui/lending/SupplyButtonComponents";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useAaveInteract } from "@/utils/aave/interact";
import { RateMode } from "@/types/aave";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { getExplorerUrl } from "@/utils/common";
import { toast } from "sonner";
import { useState, useEffect, FC, ReactNode, ChangeEvent } from "react";
import { SupportedChainId } from "@/config/aave";
import type { Token, Chain } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";
import { getHealthFactorColor } from "@/utils/aave/utils";

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

// Main Repay Modal Component
interface RepayModalProps {
  tokenSymbol?: string;
  tokenName?: string;
  tokenIcon?: string;
  chainId?: number;
  walletBalance?: string;
  currentDebt?: string;
  debtUSD?: string;
  borrowAPY?: string;
  stableDebt?: string;
  variableDebt?: string;
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
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const { repay } = useAaveInteract();

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

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setRepayAmount(value);
    }
  };

  const handleMaxClick = () => {
    // Max should be the full debt amount, not limited by wallet balance
    const maxDebtAmount = parseFloat(currentDebt) || 0;
    setRepayAmount(maxDebtAmount.toString());
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      toast.error("wallet not connected", {
        description: "please connect your wallet to continue",
      });
      return;
    }

    // Check if we have required token info
    if (
      !tokenAddress ||
      tokenAddress === "" ||
      tokenAddress === "0x0000000000000000000000000000000000000000"
    ) {
      toast.error("token information missing", {
        description: `unable to find token contract address for ${tokenSymbol}`,
      });
      return;
    }

    // Check if we have valid decimals
    if (!tokenDecimals || tokenDecimals <= 0) {
      toast.error("token decimals missing", {
        description: `invalid token decimals for ${tokenSymbol}: ${tokenDecimals}`,
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

      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();

      // Call the Aave repay transaction
      const result = await repay({
        tokenAddress,
        amount: repayAmount,
        rateMode: repayMode,
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId: currentChainId as SupportedChainId,
      });

      if (result.success) {
        toast.success("repayment successful!", {
          description: `successfully repaid ${repayAmount} ${tokenSymbol}`,
          action: result.txHash
            ? {
                label: "view transaction",
                onClick: () =>
                  window.open(
                    getExplorerUrl(result.txHash!, currentChainId),
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
        toast.error("repayment failed", {
          description: result.error || "unknown error occurred",
        });
      }
    } catch (error) {
      console.error("Repay error:", error);
      toast.error("repayment failed", {
        description:
          error instanceof Error ? error.message : "unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const chain: Chain = getChainByChainId(chainId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[460px] bg-[#18181B] border-[#27272A] text-white">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <TokenImage token={token} chain={chain} size="sm" />
              <DialogTitle className="text-lg font-semibold">
                repay {tokenSymbol}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Debt Info */}
            <div className="space-y-3 p-4 bg-[#1A1A1A] rounded-lg border border-[#232326]">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">current debt</span>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {currentDebt} {tokenSymbol}
                  </div>
                  <div className="text-xs text-gray-400">${debtUSD}</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">debt type</span>
                <span className="text-sm text-red-400">
                  {getDebtTypeDisplay()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">borrow apy</span>
                <span className="text-sm text-red-400">{borrowAPY}</span>
              </div>
            </div>

            {/* Repay Amount Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-300">
                  repay amount
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    wallet: {walletBalance} {tokenSymbol.toLowerCase()}
                  </span>
                  <button
                    type="button"
                    onClick={handleMaxClick}
                    className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-500 hover:text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    max
                  </button>
                </div>
              </div>

              <div className="relative">
                <Input
                  type="text"
                  placeholder="0.00"
                  value={repayAmount}
                  onChange={handleAmountChange}
                  className="bg-[#1A1A1A] border-[#232326] text-white"
                />
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
                    ? `amount exceeds debt (${maxDebtAmount.toFixed(6)} ${tokenSymbol})`
                    : "please enter a valid amount"}
                </div>
              )}

              {/* Insufficient balance warning (but don't prevent submission) */}
              {repayAmount && isAmountValid && hasInsufficientBalance && (
                <div className="flex items-start gap-2 text-yellow-400 text-xs">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <div className="break-words">
                    insufficient wallet balance (have:{" "}
                    {walletBalanceNum.toFixed(6)} {tokenSymbol.toLowerCase()})
                  </div>
                </div>
              )}
            </div>

            {/* Health Factor Impact */}
            {totalDebtUSD > 0 && repayAmountNum > 0 && (
              <div className="space-y-3 p-4 bg-[#1A1A1A] rounded-lg border border-[#232326]">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">
                    health factor impact
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">current</span>
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
                  <span className="text-sm text-gray-400">after repayment</span>
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

            <div className="flex gap-3 pt-2">
              <div className="flex-1">
                <BlueButton
                  onClick={handleRepay}
                  disabled={!isFormValid}
                  className={cn(
                    "h-8 py-2",
                    !isFormValid ? "opacity-50 cursor-not-allowed" : "",
                  )}
                >
                  {isSubmitting ? "repaying..." : `repay`}
                </BlueButton>
              </div>

              <DialogClose asChild>
                <div className="flex-1">
                  <GrayButton className="h-8 py-2">cancel</GrayButton>
                </div>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default RepayModal;
