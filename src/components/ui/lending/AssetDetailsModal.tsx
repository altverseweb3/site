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
import { useState, useEffect, FC, ReactNode } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Chain } from "@/types/web3";
import { AaveReserveData, ExtendedAssetDetails } from "@/types/aave";
import {
  calculateUtilizationRate,
  fetchExtendedAssetDetails,
  getReserveMetrics,
} from "@/utils/aave/fetch";
import { getChainByChainId } from "@/config/chains";
import { formatBalance, formatCurrency, truncateAddress } from "@/utils/formatters";

interface AssetDetailsModalProps {
  currentAsset: AaveReserveData;
  children: ReactNode;
}

const AssetDetailsModal: FC<AssetDetailsModalProps> = ({
  currentAsset,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [extendedDetails, setExtendedDetails] =
    useState<ExtendedAssetDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !isOpen || !currentAsset.asset) return;

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const details = await fetchExtendedAssetDetails(
          currentAsset,
          currentAsset.asset.chainId,
        );
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
  }, [isOpen, isMounted, currentAsset]);

  if (!isMounted) {
    return null;
  }

  const chain: Chain = getChainByChainId(currentAsset.asset.chainId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl bg-[#18181B] border-[#27272A] text-white max-h-[90vh] overflow-hidden flex flex-col rounded-lg">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <TokenImage token={currentAsset.asset} chain={chain} size="sm" />
              <DialogTitle className="text-lg font-semibold">
                {currentAsset.asset.ticker} details
              </DialogTitle>
              <button
                onClick={() =>
                  window.open(
                    `${chain.explorerUrl}/token/${currentAsset.asset}`,
                    "_blank",
                  )
                }
                className="p-1 hover:bg-[#1A1A1A] rounded-md transition-colors"
                title="view on block explorer"
              >
                <ExternalLink className="h-3 w-3 text-zinc-400" />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto flex-1 scrollbar-hide">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span className="ml-3 text-zinc-400">
                  loading asset details...
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
                        total supplied
                      </div>
                      <div className="text-3xl font-bold text-white mb-1">
                        {formatCurrency(
                          parseFloat(metrics.reserveSize) * tokenPrice,
                        )}
                      </div>
                      <div className="text-sm text-zinc-500 mb-1">
                        {formatBalance(metrics.reserveSize)}{" "}
                        {currentAsset.asset.ticker}
                      </div>
                      <div className="text-xs text-zinc-400 mb-3">
                        {metrics.supplyCapFormatted !== "Unlimited"
                          ? `of ${metrics.supplyCapFormatted} ${currentAsset.asset.ticker} possible`
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
                            no supply cap
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
                      <div className="text-sm text-zinc-400 mb-2">
                        total borrowed
                      </div>
                      <div className="text-3xl font-bold text-white mb-1">
                        {formatCurrency(
                          parseFloat(metrics.totalBorrowed) * tokenPrice,
                        )}
                      </div>
                      <div className="text-sm text-zinc-500 mb-1">
                        {formatBalance(metrics.totalBorrowed)}{" "}
                        {currentAsset.asset.ticker}
                      </div>
                      <div className="text-xs text-zinc-400 mb-3">
                        {metrics.borrowCapFormatted !== "No cap"
                          ? `of ${metrics.borrowCapFormatted} ${currentAsset.asset.ticker} possible`
                          : "no borrow cap"}
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
                            no borrow cap
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-zinc-400 mb-2">
                          utilization rate
                        </div>
                        <div className="text-3xl font-bold text-blue-500 mb-1">
                          {calculateUtilizationRate(currentAsset)}%
                        </div>
                        <div className="text-sm text-zinc-500">
                          {formatCurrency(
                            parseFloat(metrics.totalBorrowed) * tokenPrice,
                          )}{" "}
                          of{" "}
                          {formatCurrency(
                            parseFloat(metrics.reserveSize) * tokenPrice,
                          )}
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
                          oracle price
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {formatCurrency(tokenPrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-zinc-400 mb-2">market</div>
                        <div className="text-lg text-zinc-300">aave v3</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        supply info
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">total supplied</span>
                          <div className="text-right">
                            <div className="text-white font-medium">
                              {formatBalance(metrics.reserveSize)}{" "}
                              {currentAsset.asset.ticker}
                            </div>
                            <div className="text-sm text-zinc-500">
                              {formatCurrency(
                                parseFloat(metrics.reserveSize) * tokenPrice,
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">supply APY</span>
                          <span className="text-green-500 font-medium">
                            {currentAsset.supplyAPY}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">supply cap</span>
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
                            can be collateral
                          </span>
                          <span
                            className={cn(
                              "font-medium",
                              currentAsset.canBeCollateral
                                ? "text-green-500"
                                : "text-red-500",
                            )}
                          >
                            {currentAsset.canBeCollateral ? "yes" : "no"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        borrow info
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">total borrowed</span>
                          <div className="text-right">
                            <div className="text-white font-medium">
                              {formatBalance(metrics.totalBorrowed)}{" "}
                              {currentAsset.asset.ticker}
                            </div>
                            <div className="text-sm text-zinc-500">
                              {formatCurrency(
                                parseFloat(metrics.totalBorrowed) * tokenPrice,
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">variable APY</span>
                          <span className="text-red-500 font-medium">
                            {currentAsset.variableBorrowAPY}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">stable APY</span>
                          <span className="text-amber-500 font-medium">
                            {currentAsset.stableBorrowAPY}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">borrow cap</span>
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
                          <span className="text-zinc-400">can be borrowed</span>
                          <span
                            className={cn(
                              "font-medium",
                              currentAsset.borrowingEnabled
                                ? "text-green-500"
                                : "text-red-500",
                            )}
                          >
                            {currentAsset.borrowingEnabled ? "yes" : "no"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#232326]">
              <h3 className="text-sm font-semibold mb-3">risk parameters</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-zinc-400">max LTV</span>
                  <div className="text-sm font-medium">
                    {extendedDetails?.ltv || "N/A"}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-zinc-400">
                    liquidation threshold
                  </span>
                  <div className="text-sm font-medium">
                    {extendedDetails?.liquidationThreshold || "N/A"}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-zinc-400">
                    liquidation penalty
                  </span>
                  <div className="text-sm font-medium">
                    {extendedDetails?.liquidationPenalty || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#232326]">
              <h3 className="text-sm font-semibold mb-3">configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">
                      can be collateral
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        currentAsset.canBeCollateral
                          ? "text-green-500"
                          : "text-red-500",
                      )}
                    >
                      {currentAsset.canBeCollateral ? "yes" : "no"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">
                      can be borrowed
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        currentAsset.borrowingEnabled
                          ? "text-green-500"
                          : "text-red-500",
                      )}
                    >
                      {currentAsset.borrowingEnabled ? "yes" : "no"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">asset status</span>
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
                        ? "frozen"
                        : currentAsset.isActive
                          ? "active"
                          : "inactive"}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">
                      stable borrow enabled
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        currentAsset.stableBorrowEnabled
                          ? "text-green-500"
                          : "text-red-500",
                      )}
                    >
                      {currentAsset.stableBorrowEnabled ? "yes" : "no"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-400">
                      isolation mode
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
                        ? "enabled"
                        : "disabled"}
                    </span>
                  </div>
                  {currentAsset.isIsolationModeAsset &&
                    currentAsset.debtCeiling && (
                      <div className="flex justify-between">
                        <span className="text-sm text-zinc-400">
                          isolation ceiling
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
              <h3 className="text-sm font-semibold mb-3">contract addresses</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">token</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">format</span>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          currentAsset.asset.address,
                        )
                      }
                      className="text-zinc-400 hover:text-white"
                      title="Copy address"
                    ></button>
                  </div>
                </div>
                {currentAsset.aTokenAddress && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">atoken</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {truncateAddress(currentAsset.aTokenAddress)}
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            currentAsset.aTokenAddress,
                          )
                        }
                        className="text-zinc-400 hover:text-white"
                        title="copy address"
                      ></button>
                    </div>
                  </div>
                )}
                {extendedDetails?.variableDebtTokenAddress && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">variable debt token</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {truncateAddress(
                          extendedDetails.variableDebtTokenAddress,
                        )}
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            extendedDetails.variableDebtTokenAddress!,
                          )
                        }
                        className="text-zinc-400 hover:text-white"
                        title="copy address"
                      ></button>
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
                  close
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
