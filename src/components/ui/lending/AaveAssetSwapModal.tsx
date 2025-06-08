"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/StyledDialog";
import {
  AlertCircle,
  Info,
  ArrowUpDown,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TokenImage } from "@/components/ui/TokenImage";
import { Chain } from "@/types/web3";
import {
  formatHealthFactor,
  getHealthFactorColor,
} from "@/utils/healthFactorUtils";

// Simple asset interface for the modal
interface SwapAsset {
  address: string;
  symbol: string;
  name?: string;
  decimals?: number;
  balance?: string;
  priceUSD?: number;
  tokenPrice?: number;
  canBeCollateral?: boolean;
  isUsedAsCollateral?: boolean;
  currentATokenBalance?: string;
  currentStableDebt?: string;
  currentVariableDebt?: string;
  liquidationThreshold?: number;
}

// Asset selector component
interface AssetSelectorProps {
  assets: SwapAsset[];
  selectedAsset: SwapAsset | null;
  onSelectAsset: (asset: SwapAsset) => void;
  label: string;
  type: "supplied" | "borrowed";
  chain: Chain;
}

const AssetSelector: React.FC<AssetSelectorProps> = ({
  assets,
  selectedAsset,
  onSelectAsset,
  label,
  type,
  chain,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-400">{label}</label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-gray-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-600 transition-colors"
        >
          {selectedAsset ? (
            <div className="flex items-center gap-3">
              <TokenImage
                token={{
                  id: selectedAsset.address,
                  name: selectedAsset.name || selectedAsset.symbol,
                  ticker: selectedAsset.symbol,
                  address: selectedAsset.address,
                  decimals: selectedAsset.decimals || 18,
                  icon: selectedAsset.symbol.toLowerCase() + ".png",
                  native:
                    selectedAsset.symbol === "ETH" ||
                    selectedAsset.symbol === "MATIC" ||
                    selectedAsset.symbol === "AVAX" ||
                    selectedAsset.symbol === "BNB",
                  chainId: chain.chainId,
                }}
                chain={chain}
                size="md"
              />
              <div className="text-left">
                <div className="text-white font-medium">
                  {selectedAsset.symbol}
                </div>
                <div className="text-gray-400 text-xs">
                  {type === "supplied"
                    ? `${selectedAsset.currentATokenBalance || "0"} supplied`
                    : `${selectedAsset.currentStableDebt || selectedAsset.currentVariableDebt || "0"} borrowed`}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-gray-400">Select {type} asset</span>
          )}
          <ChevronDown
            size={20}
            className={cn(
              "text-gray-400 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            {assets.length > 0 ? (
              assets.map((asset) => (
                <button
                  key={asset.address}
                  onClick={() => {
                    onSelectAsset(asset);
                    setIsOpen(false);
                  }}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-600 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <TokenImage
                    token={{
                      id: asset.address,
                      name: asset.name || asset.symbol,
                      ticker: asset.symbol,
                      address: asset.address,
                      decimals: asset.decimals || 18,
                      icon: asset.symbol.toLowerCase() + ".png",
                      native:
                        asset.symbol === "ETH" ||
                        asset.symbol === "MATIC" ||
                        asset.symbol === "AVAX" ||
                        asset.symbol === "BNB",
                      chainId: chain.chainId,
                    }}
                    chain={chain}
                    size="sm"
                  />
                  <div className="text-left flex-1">
                    <div className="text-white text-sm font-medium">
                      {asset.symbol}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {type === "supplied"
                        ? `${asset.currentATokenBalance || "0"} supplied`
                        : `${asset.currentStableDebt || asset.currentVariableDebt || "0"} borrowed`}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-gray-400 text-sm">
                No {type} assets available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Health factor calculation utilities
const calculateHealthFactorChange = (
  type: "supplied" | "borrowed",
  currentCollateralUSD: number,
  currentDebtUSD: number,
  swapAmountUSD: number,
  fromAssetLiquidationThreshold: number,
  toAssetLiquidationThreshold: number,
  isFromCollateral: boolean,
  isToCollateral: boolean,
): { newHealthFactor: number; change: number } => {
  let newCollateralUSD = currentCollateralUSD;
  let newDebtUSD = currentDebtUSD;

  if (type === "supplied") {
    // Withdraw from asset affects collateral if it was used as collateral
    if (isFromCollateral) {
      newCollateralUSD -= swapAmountUSD * fromAssetLiquidationThreshold;
    }
    // Supply to asset adds to collateral if it can be used as collateral
    if (isToCollateral) {
      newCollateralUSD += swapAmountUSD * toAssetLiquidationThreshold;
    }
  } else {
    // For borrowed assets, we're changing debt composition but net debt stays same
    // The health factor change depends on any collateral requirements difference
    // For simplicity, assume minimal change unless there are significant differences
    newDebtUSD = currentDebtUSD; // Net debt doesn't change in borrow swap
  }

  const newHealthFactor =
    newDebtUSD === 0 ? 999 : newCollateralUSD / newDebtUSD;
  const currentHealthFactor =
    currentDebtUSD === 0 ? 999 : currentCollateralUSD / currentDebtUSD;

  return {
    newHealthFactor,
    change: newHealthFactor - currentHealthFactor,
  };
};

// Main modal component
interface AaveAssetSwapModalProps {
  type: "supplied" | "borrowed";
  currentAsset: {
    address: string;
    symbol: string;
    name?: string;
    decimals: number;
    balance: string;
    liquidationThreshold?: number;
    isUsedAsCollateral?: boolean;
    tokenPrice?: number;
  };
  availableAssets: SwapAsset[];
  onSwapAssets?: (
    fromAsset: SwapAsset,
    toAsset: SwapAsset,
    amount: string,
  ) => Promise<boolean>;
  children: React.ReactNode;
  isLoading?: boolean;
  chain: Chain;
  healthFactor?: string;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
}

const AaveAssetSwapModal: React.FC<AaveAssetSwapModalProps> = ({
  type,
  currentAsset,
  availableAssets,
  onSwapAssets = async () => true,
  children,
  isLoading = false,
  chain,
  healthFactor = "∞",
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fromAsset = currentAsset; // Remove unused state
  const [toAsset, setToAsset] = React.useState<SwapAsset | null>(null);
  const [swapAmount, setSwapAmount] = React.useState("");

  // Filter out current asset from available options
  const targetAssets = availableAssets.filter(
    (asset) =>
      asset.address.toLowerCase() !== currentAsset.address.toLowerCase(),
  );

  // Validation
  const maxAmount = parseFloat(currentAsset.balance) || 0;
  const swapAmountNum = parseFloat(swapAmount) || 0;
  const isAmountValid = swapAmountNum > 0 && swapAmountNum <= maxAmount;
  const isFormValid = isAmountValid && toAsset && !isLoading && !isSubmitting;

  // Health factor calculations
  const currentHealthFactorNum = parseFloat(healthFactor) || 999;
  const swapAmountUSD = swapAmountNum * (fromAsset.tokenPrice || 1);

  const healthFactorChange = toAsset
    ? calculateHealthFactorChange(
        type,
        totalCollateralUSD,
        totalDebtUSD,
        swapAmountUSD,
        fromAsset.liquidationThreshold || 0.8,
        toAsset.liquidationThreshold || 0.8,
        currentAsset.isUsedAsCollateral || false,
        toAsset.canBeCollateral || false,
      )
    : { newHealthFactor: currentHealthFactorNum, change: 0 };

  const handleSwap = async () => {
    if (!isFormValid || !toAsset) return;

    setIsSubmitting(true);
    try {
      const success = await onSwapAssets(fromAsset, toAsset, swapAmount);
      if (success) {
        setIsOpen(false);
        setSwapAmount("");
        setToAsset(null);
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaxClick = () => {
    setSwapAmount(maxAmount.toString());
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setSwapAmount(value);
    }
  };

  const swapTitle =
    type === "supplied" ? "Swap Supplied Assets" : "Swap Borrowed Assets";
  const actionText =
    type === "supplied" ? "withdraw and supply" : "borrow and repay";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-semibold">
            {swapTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-white">
          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Amount to swap</label>
            <div
              className={cn(
                "bg-gray-700 rounded-lg p-4 flex items-center justify-between transition-colors",
                !isAmountValid && swapAmount && "ring-2 ring-red-500",
              )}
            >
              <div className="flex flex-col flex-1">
                <input
                  type="text"
                  value={swapAmount}
                  onChange={handleAmountChange}
                  disabled={isLoading || isSubmitting}
                  className="bg-transparent text-white text-2xl font-semibold outline-none w-full"
                  placeholder="0.0"
                />
                <span className="text-gray-400 text-sm">
                  Max: {maxAmount.toFixed(6)} {currentAsset.symbol}
                </span>
              </div>
              <button
                onClick={handleMaxClick}
                disabled={isLoading || isSubmitting}
                className="text-orange-400 hover:text-orange-300 transition-colors px-2 py-1 rounded disabled:opacity-50 text-sm"
              >
                MAX
              </button>
            </div>

            {!isAmountValid && swapAmount && (
              <p className="text-red-400 text-xs">
                {swapAmountNum > maxAmount
                  ? "Amount exceeds available balance"
                  : "Enter a valid amount"}
              </p>
            )}
          </div>

          {/* From Asset (Fixed to current) */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">
              From (Current {type} asset)
            </label>
            <div className="bg-gray-700 rounded-lg p-4 flex items-center gap-3 opacity-75">
              <TokenImage
                token={{
                  id: currentAsset.address,
                  name: currentAsset.name || currentAsset.symbol,
                  ticker: currentAsset.symbol,
                  address: currentAsset.address,
                  decimals: currentAsset.decimals,
                  icon: currentAsset.symbol.toLowerCase() + ".png",
                  native:
                    currentAsset.symbol === "ETH" ||
                    currentAsset.symbol === "MATIC" ||
                    currentAsset.symbol === "AVAX" ||
                    currentAsset.symbol === "BNB",
                  chainId: chain.chainId,
                }}
                chain={chain}
                size="md"
              />
              <div>
                <div className="text-white font-medium">
                  {currentAsset.symbol}
                </div>
                <div className="text-gray-400 text-xs">
                  {currentAsset.balance} {type}
                </div>
              </div>
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center">
            <ArrowUpDown size={20} className="text-gray-400" />
          </div>

          {/* To Asset Selector */}
          <AssetSelector
            assets={targetAssets}
            selectedAsset={toAsset}
            onSelectAsset={setToAsset}
            label="To (Target asset)"
            type={type}
            chain={chain}
          />

          {/* Transaction Steps */}
          {toAsset && swapAmountNum > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-blue-400" />
                <span className="text-sm font-medium text-gray-300">
                  Transaction Steps
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    1
                  </div>
                  <span className="text-gray-300">
                    {type === "supplied" ? "Withdraw" : "Borrow"}{" "}
                    {swapAmountNum.toFixed(4)} {toAsset.symbol}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    2
                  </div>
                  <span className="text-gray-300">
                    {type === "supplied" ? "Supply" : "Repay"}{" "}
                    {swapAmountNum.toFixed(4)} {currentAsset.symbol}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-600">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    ✓
                  </div>
                  <span className="text-green-400 font-medium">
                    Position converted: {currentAsset.symbol} → {toAsset.symbol}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Health Factor Impact */}
          {toAsset &&
            swapAmountNum > 0 &&
            type === "supplied" &&
            Math.abs(healthFactorChange.change) > 0.01 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-green-400" />
                  <span className="text-sm font-medium text-gray-300">
                    Health Factor Impact
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current</span>
                    <span
                      className={getHealthFactorColor(currentHealthFactorNum)}
                    >
                      {formatHealthFactor(currentHealthFactorNum)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">After Swap</span>
                    <span
                      className={getHealthFactorColor(
                        healthFactorChange.newHealthFactor,
                      )}
                    >
                      {formatHealthFactor(healthFactorChange.newHealthFactor)}
                      <span
                        className={cn(
                          "ml-1 text-xs",
                          healthFactorChange.change > 0
                            ? "text-green-400"
                            : "text-red-400",
                        )}
                      >
                        ({healthFactorChange.change > 0 ? "+" : ""}
                        {healthFactorChange.change.toFixed(2)})
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

          {/* Warning */}
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-yellow-400 mt-0.5" />
              <div className="text-xs text-yellow-200">
                <div className="font-medium mb-1">Important Notice</div>
                <div>
                  This will {actionText} your position. Make sure you understand
                  the implications of this swap.
                  {type === "borrowed" &&
                    " Ensure you have sufficient collateral for the new borrow position."}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={!isFormValid}
          className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors mt-6"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Swapping...
            </span>
          ) : isLoading ? (
            "Loading..."
          ) : !toAsset ? (
            "Select target asset"
          ) : (
            `Swap to ${toAsset.symbol}`
          )}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export { AaveAssetSwapModal };
