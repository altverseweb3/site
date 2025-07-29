"use client";

import { ExternalLink } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, FC, ReactNode } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AaveReserveData } from "@/utils/aave/fetch";
import type { Token, Chain } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";
import {
  ExtendedAssetDetails,
  getReserveMetrics,
  calculateUtilizationRate,
  formatUSDValue,
} from "@/utils/aave/calculations";
import { fetchExtendedAssetDetails } from "@/utils/aave/extendedDetails";
import { formatBalance } from "@/utils/common";

interface AssetDetailsModalProps {
  assetData?: AaveReserveData;
  tokenSymbol?: string;
  tokenName?: string;
  tokenIcon?: string;
  chainId?: number;
  tokenAddress?: string;
  tokenDecimals?: number;
  children: ReactNode;
}

const AssetDetailsModal: FC<AssetDetailsModalProps> = ({
  assetData,
  tokenSymbol = "USDC",
  tokenName = "USD Coin",
  tokenIcon = "usdc.png",
  chainId = 1,
  tokenAddress = "",
  tokenDecimals = 18,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [extendedDetails, setExtendedDetails] =
    useState<ExtendedAssetDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const currentAsset: AaveReserveData = useMemo(
    () =>
      assetData || {
        symbol: tokenSymbol,
        name: tokenName,
        asset: tokenAddress,
        decimals: tokenDecimals,
        chainId: chainId,
        tokenIcon: tokenIcon,
        aTokenAddress: "",
        currentLiquidityRate: "0",
        totalSupply: "0",
        formattedSupply: "0",
        supplyAPY: "0.00",
        canBeCollateral: false,
        variableBorrowRate: "0",
        stableBorrowRate: "0",
        variableBorrowAPY: "0.00",
        stableBorrowAPY: "0.00",
        stableBorrowEnabled: false,
        borrowingEnabled: false,
        totalBorrowed: "0",
        formattedTotalBorrowed: "0",
        availableLiquidity: "0",
        formattedAvailableLiquidity: "0",
        borrowCap: "0",
        formattedBorrowCap: "0",
        isActive: true,
        isFrozen: false,
        isIsolationModeAsset: false,
        debtCeiling: 0,
        userBalance: "0",
        userBalanceFormatted: "0.00",
        userBalanceUsd: "0.00",
      },
    [
      assetData,
      tokenSymbol,
      tokenName,
      tokenAddress,
      tokenDecimals,
      chainId,
      tokenIcon,
    ],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !isOpen || !currentAsset.asset) return;

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const details = await fetchExtendedAssetDetails(currentAsset, chainId);
        setExtendedDetails(details);
      } catch (err) {
        console.error("Error fetching extended asset details:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch extended details",
        );

        setExtendedDetails({
          ltv: "80.00%",
          liquidationThreshold: "85.00%",
          liquidationPenalty: "5.00%",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, isMounted, currentAsset, chainId]);

  if (!isMounted) {
    return null;
  }

  const token: Token = {
    id: currentAsset.asset,
    name: currentAsset.name,
    ticker: currentAsset.symbol,
    icon: currentAsset.tokenIcon || tokenIcon,
    address: currentAsset.asset,
    decimals: currentAsset.decimals,
    chainId: currentAsset.chainId || chainId,
    stringChainId: (currentAsset.chainId || chainId).toString(),
  };

  const chain: Chain = getChainByChainId(currentAsset.chainId || chainId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="sm:max-w-2xl bg-[#131313] border-[#232326] text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full overflow-hidden">
                  <TokenImage token={token} chain={chain} size="sm" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-semibold">
                      {currentAsset.symbol} Details
                    </DialogTitle>
                    <button
                      onClick={() =>
                        window.open(
                          `https://etherscan.io/token/${currentAsset.asset}`,
                          "_blank",
                        )
                      }
                      className="p-1 hover:bg-[#1A1A1A] rounded-md transition-colors"
                      title="View on Etherscan"
                    >
                      <ExternalLink className="h-3 w-3 text-zinc-400" />
                    </button>
                  </div>
                  <p className="text-sm text-zinc-400">{currentAsset.name}</p>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span className="ml-3 text-zinc-400">
                  Loading asset details...
                </span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            {(() => {
              const metrics = getReserveMetrics(currentAsset, extendedDetails);
              const tokenPrice = extendedDetails?.oraclePrice || 1;

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
                      <div className="text-sm text-zinc-400 mb-2">
                        Total supplied
                      </div>
                      <div className="text-3xl font-bold text-white mb-1">
                        {formatUSDValue(metrics.reserveSize, tokenPrice)}
                      </div>
                      <div className="text-sm text-zinc-500 mb-1">
                        {formatBalance(metrics.reserveSize)}{" "}
                        {currentAsset.symbol}
                      </div>
                      <div className="text-xs text-zinc-400 mb-3">
                        {metrics.supplyCapFormatted !== "Unlimited"
                          ? `of ${metrics.supplyCapFormatted} ${currentAsset.symbol} possible`
                          : "Unlimited supply cap"}
                      </div>

                      <div className="space-y-2">
                        {metrics.supplyCapFormatted !== "Unlimited" &&
                        metrics.supplyCapUtilization > 0 ? (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">
                                total supplied
                              </span>
                              <span className="text-amber-500">
                                {metrics.supplyCapUtilization.toFixed(1)}%
                              </span>
                            </div>
                            <ProgressBar
                              value={Math.min(
                                metrics.supplyCapUtilization,
                                100,
                              )}
                              color="amber"
                              size="md"
                            />
                          </>
                        ) : (
                          <div className="text-xs text-zinc-400">
                            No supply cap
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
                      <div className="text-sm text-zinc-400 mb-2">
                        Total borrowed
                      </div>
                      <div className="text-3xl font-bold text-white mb-1">
                        {formatUSDValue(metrics.totalBorrowed, tokenPrice)}
                      </div>
                      <div className="text-sm text-zinc-500 mb-1">
                        {formatBalance(metrics.totalBorrowed)}{" "}
                        {currentAsset.symbol}
                      </div>
                      <div className="text-xs text-zinc-400 mb-3">
                        {metrics.borrowCapFormatted !== "No cap"
                          ? `of ${metrics.borrowCapFormatted} ${currentAsset.symbol} possible`
                          : "No borrow cap"}
                      </div>

                      <div className="space-y-2">
                        {metrics.borrowCapFormatted !== "No cap" &&
                        metrics.borrowCapUtilization > 0 ? (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">
                                total borrowed
                              </span>
                              <span className="text-red-500">
                                {metrics.borrowCapUtilization.toFixed(1)}%
                              </span>
                            </div>
                            <ProgressBar
                              value={Math.min(
                                metrics.borrowCapUtilization,
                                100,
                              )}
                              color="red"
                              size="md"
                            />
                          </>
                        ) : (
                          <div className="text-xs text-zinc-400">
                            No borrow cap
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-400 mb-2">
                          Utilization Rate
                        </div>
                        <div className="text-3xl font-bold text-blue-500 mb-1">
                          {calculateUtilizationRate(currentAsset)}%
                        </div>
                        <div className="text-sm text-zinc-500">
                          {formatUSDValue(metrics.totalBorrowed, tokenPrice)} of{" "}
                          {formatUSDValue(metrics.reserveSize, tokenPrice)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          value={metrics.borrowedPercentage}
                          color="blue"
                          size="lg"
                          className="w-24"
                        />
                        <span className="text-sm text-blue-500 font-medium">
                          {metrics.borrowedPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-400 mb-2">
                          Oracle price
                        </div>
                        <div className="text-2xl font-bold text-white">
                          ${Math.round(tokenPrice * 100) / 100}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-zinc-400 mb-2">Market</div>
                        <div className="text-lg text-zinc-300">Aave V3</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        Supply Info
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Total supplied</span>
                          <div className="text-right">
                            <div className="text-white font-medium">
                              {formatBalance(metrics.reserveSize)}{" "}
                              {currentAsset.symbol}
                            </div>
                            <div className="text-sm text-zinc-500">
                              {formatUSDValue(metrics.reserveSize, tokenPrice)}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Supply APY</span>
                          <span className="text-green-500 font-medium">
                            {currentAsset.supplyAPY}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Supply cap</span>
                          <div className="text-right">
                            <div className="text-white">
                              {metrics.supplyCapFormatted}
                            </div>
                            {metrics.supplyCapUtilization > 0 && (
                              <div className="text-sm text-amber-500">
                                {metrics.supplyCapUtilization.toFixed(1)}% used
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">
                            Can be collateral
                          </span>
                          <span
                            className={cn(
                              "font-medium",
                              currentAsset.canBeCollateral
                                ? "text-green-500"
                                : "text-red-500",
                            )}
                          >
                            {currentAsset.canBeCollateral ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        Borrow Info
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Total borrowed</span>
                          <div className="text-right">
                            <div className="text-white font-medium">
                              {formatBalance(metrics.totalBorrowed)}{" "}
                              {currentAsset.symbol}
                            </div>
                            <div className="text-sm text-zinc-500">
                              {formatUSDValue(
                                metrics.totalBorrowed,
                                tokenPrice,
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Variable APY</span>
                          <span className="text-red-500 font-medium">
                            {currentAsset.variableBorrowAPY}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Stable APY</span>
                          <span className="text-amber-500 font-medium">
                            {currentAsset.stableBorrowAPY}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Borrow cap</span>
                          <div className="text-right">
                            <div className="text-white">
                              {metrics.borrowCapFormatted}
                            </div>
                            {metrics.borrowCapUtilization > 0 && (
                              <div className="text-sm text-amber-500">
                                {metrics.borrowCapUtilization.toFixed(1)}% used
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Can be borrowed</span>
                          <span
                            className={cn(
                              "font-medium",
                              currentAsset.borrowingEnabled
                                ? "text-green-500"
                                : "text-red-500",
                            )}
                          >
                            {currentAsset.borrowingEnabled ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#232326]">
              <h3 className="text-sm font-semibold mb-3">Risk Parameters</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-zinc-400">Max LTV</span>
                  <div className="text-sm font-medium">
                    {extendedDetails?.ltv || "Loading..."}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-zinc-400">
                    Liquidation Threshold
                  </span>
                  <div className="text-sm font-medium">
                    {extendedDetails?.liquidationThreshold || "Loading..."}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-zinc-400">
                    Liquidation Penalty
                  </span>
                  <div className="text-sm font-medium">
                    {extendedDetails?.liquidationPenalty || "Loading..."}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#232326]">
              <h3 className="text-sm font-semibold mb-3">Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">
                      Can be Collateral
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        currentAsset.canBeCollateral
                          ? "text-green-500"
                          : "text-red-500",
                      )}
                    >
                      {currentAsset.canBeCollateral ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">
                      Can be Borrowed
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        currentAsset.borrowingEnabled
                          ? "text-green-500"
                          : "text-red-500",
                      )}
                    >
                      {currentAsset.borrowingEnabled ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">Asset Status</span>
                    <span
                      className={cn(
                        "text-sm",
                        currentAsset.isFrozen
                          ? "text-red-500"
                          : currentAsset.isActive
                            ? "text-green-500"
                            : "text-amber-500",
                      )}
                    >
                      {currentAsset.isFrozen
                        ? "Frozen"
                        : currentAsset.isActive
                          ? "Active"
                          : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">
                      Stable Borrow Enabled
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        currentAsset.stableBorrowEnabled
                          ? "text-green-500"
                          : "text-red-500",
                      )}
                    >
                      {currentAsset.stableBorrowEnabled ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">
                      Isolation Mode
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        currentAsset.isIsolationModeAsset
                          ? "text-amber-500"
                          : "text-zinc-400",
                      )}
                    >
                      {currentAsset.isIsolationModeAsset
                        ? "Enabled"
                        : "Disabled"}
                    </span>
                  </div>
                  {currentAsset.isIsolationModeAsset &&
                    currentAsset.debtCeiling && (
                      <div className="flex justify-between">
                        <span className="text-sm text-zinc-400">
                          Isolation Ceiling
                        </span>
                        <span className="text-sm text-amber-500">
                          ${currentAsset.debtCeiling.toLocaleString()}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#232326]">
              <h3 className="text-sm font-semibold mb-3">Contract Addresses</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Token</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {currentAsset.asset.slice(0, 10)}...
                      {currentAsset.asset.slice(-8)}
                    </span>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(currentAsset.asset)
                      }
                      className="text-zinc-400 hover:text-white"
                      title="Copy address"
                    >
                      📋
                    </button>
                  </div>
                </div>
                {currentAsset.aTokenAddress && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">aToken</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {currentAsset.aTokenAddress.slice(0, 10)}...
                        {currentAsset.aTokenAddress.slice(-8)}
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            currentAsset.aTokenAddress,
                          )
                        }
                        className="text-zinc-400 hover:text-white"
                        title="Copy address"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}
                {extendedDetails?.variableDebtTokenAddress && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Variable Debt Token</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {extendedDetails.variableDebtTokenAddress.slice(0, 10)}
                        ...{extendedDetails.variableDebtTokenAddress.slice(-8)}
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            extendedDetails.variableDebtTokenAddress!,
                          )
                        }
                        className="text-zinc-400 hover:text-white"
                        title="Copy address"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-[#232326] text-zinc-300 hover:bg-[#1A1A1A]"
                >
                  Close
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default AssetDetailsModal;
