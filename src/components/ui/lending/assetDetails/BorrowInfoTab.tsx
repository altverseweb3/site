import { InfoRow } from "@/components/ui/lending/assetDetails/InfoRow";
import { UnifiedMarketData } from "@/types/aave";
import HorizontalProgressBar from "@/components/ui/HorizontalProgressBar";
import {
  formatCurrency,
  formatPercentage,
  formatBalance,
} from "@/utils/formatters";
import {
  TrendingDown,
  SquareMinus,
  SquareEqual,
  AlertTriangle,
  Infinity,
} from "lucide-react";

export const BorrowInfoTab: React.FC<{
  market: UnifiedMarketData;
  finalAPY: number;
  hasBorrowBonuses: boolean;
  hasMixedIncentives: boolean;
}> = ({ market, finalAPY, hasBorrowBonuses, hasMixedIncentives }) => {
  const borrowInfo = market.borrowInfo;

  if (!borrowInfo) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">
          borrowing not available for this asset
        </div>
      </div>
    );
  }

  // Calculate borrow utilization
  const hasBorrowCap = borrowInfo.borrowCap.amount.value !== "0";
  const borrowCapTokens = hasBorrowCap
    ? parseFloat(borrowInfo.borrowCap.amount.value)
    : 0;
  const borrowCapUsd = hasBorrowCap ? borrowInfo.borrowCap.usd : 0;
  const currentBorrowedTokens = parseFloat(market.borrowData.totalBorrowed);
  const currentBorrowedUsd = market.borrowData.totalBorrowedUsd;

  // Format values for display
  const primaryValue = `${formatBalance(market.borrowData.totalBorrowed)} ${market.underlyingToken.symbol}`;
  const secondaryValue = formatCurrency(currentBorrowedUsd);
  const maxPrimaryValue = hasBorrowCap
    ? `${formatBalance(borrowInfo.borrowCap.amount.value)} ${market.underlyingToken.symbol}`
    : "Unlimited";
  const maxSecondaryValue = hasBorrowCap
    ? formatCurrency(borrowCapUsd)
    : "No cap";

  return (
    <div className="space-y-4">
      {/* Total Borrowed Amount with Progress Bar */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-400" />
          borrow liquidity
        </h3>

        {hasBorrowCap ? (
          <HorizontalProgressBar
            current={currentBorrowedTokens}
            max={borrowCapTokens}
            label="total amount borrowed"
            primaryValue={`${primaryValue} of ${maxPrimaryValue}`}
            secondaryValue={`${secondaryValue} of ${maxSecondaryValue}`}
            color="red"
          />
        ) : (
          // Fallback for unlimited borrow cap
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Infinity className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-zinc-300">
                  Unlimited Borrow Cap
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Total Borrowed:</span>
                <span className="text-sm font-medium text-red-400">
                  {primaryValue}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">USD Value:</span>
                <span className="text-sm font-medium text-blue-400">
                  {secondaryValue}
                </span>
              </div>
            </div>
          </div>
        )}

        {borrowInfo.borrowCapReached && (
          <div className="flex items-center gap-2 text-orange-400 text-xs mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            <span>Borrow cap has been reached</span>
          </div>
        )}
      </div>

      {/* Borrow APR */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3">borrow APR</h3>
        <div className="flex justify-between items-center py-2">
          <div className="text-[#A1A1AA] text-sm">
            borrow APR (with incentives)
          </div>
          <div className="flex items-center gap-2">
            {hasBorrowBonuses && (
              <SquareMinus className="w-4 h-4 text-amber-500" />
            )}
            {hasMixedIncentives && (
              <SquareEqual className="w-4 h-4 text-indigo-500" />
            )}
            <span className="text-sm font-semibold font-mono text-red-400">
              {formatPercentage(finalAPY)}
            </span>
          </div>
        </div>
      </div>

      {/* Collector Info */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3">collector info</h3>
        <InfoRow
          label="reserve factor"
          value={formatPercentage(borrowInfo.reserveFactor.value)}
          tooltip="percentage of interest that goes to the protocol reserves"
        />
      </div>

      {/* Borrow Status */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3">borrow status</h3>
        <div className="flex flex-wrap gap-2">
          {borrowInfo.borrowingState === "ENABLED" && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
              enabled
            </span>
          )}
          {borrowInfo.borrowingState === "DISABLED" && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
              disabled
            </span>
          )}
          {borrowInfo.borrowingState === "USER_EMODE_DISABLED_BORROW" && (
            <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
              e-mode disabled
            </span>
          )}
          {market.isFrozen && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
              frozen
            </span>
          )}
          {market.isPaused && (
            <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
              paused
            </span>
          )}
        </div>
      </div>

      {/* Incentives */}
      {market.incentives && market.incentives.length > 0 && (
        <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-3">incentives</h3>
          {market.incentives.map((incentive, index) => (
            <div key={index} className="py-1 text-xs text-[#A1A1AA]">
              {incentive.__typename.includes("Borrow") && (
                <span>borrow incentive available</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BorrowInfoTab;
