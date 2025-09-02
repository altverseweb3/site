import { UnifiedMarketData } from "@/types/aave";
import { InfoRow } from "@/components/ui/lending/assetDetails/InfoRow";
import {
  formatBalance,
  formatCurrency,
  formatPercentage,
} from "@/utils/formatters";
import {
  TrendingUp,
  Shield,
  SquarePlus,
  SquareEqual,
  AlertTriangle,
} from "lucide-react";

const SupplyInfoTab: React.FC<{
  market: UnifiedMarketData;
  finalAPY: number;
  hasSupplyBonuses: boolean;
  hasMixedIncentives: boolean;
}> = ({ market, finalAPY, hasSupplyBonuses, hasMixedIncentives }) => {
  const supplyInfo = market.supplyInfo;

  // Calculate supply utilization
  const hasSupplyCap = supplyInfo.supplyCap.amount.value !== "0";
  const supplyCapTokens = hasSupplyCap
    ? supplyInfo.supplyCap.amount.value
    : "0";
  const supplyCapUsd = hasSupplyCap ? supplyInfo.supplyCap.usd : 0;

  const totalSuppliedAmount = hasSupplyCap
    ? `${formatBalance(market.supplyData.totalSupplied)} out of ${formatBalance(supplyCapTokens)} ${market.underlyingToken.symbol}`
    : `${formatBalance(market.supplyData.totalSupplied)} ${market.underlyingToken.symbol}`;

  const totalSuppliedUsd = hasSupplyCap
    ? `${formatCurrency(market.supplyData.totalSuppliedUsd)} out of ${formatCurrency(supplyCapUsd)}`
    : formatCurrency(market.supplyData.totalSuppliedUsd);

  return (
    <div className="space-y-4">
      {/* Total Supplied Amount */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          supply liquidity
        </h3>
        <InfoRow label="total supplied amount" value={totalSuppliedAmount} />
        <InfoRow label="total supplied amount (USD)" value={totalSuppliedUsd} />
        {supplyInfo.supplyCapReached && (
          <div className="flex items-center gap-2 text-orange-400 text-xs mt-2">
            <AlertTriangle className="w-3 h-3" />
            supply cap reached
          </div>
        )}
      </div>

      {/* Supply APR */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3">supply APR</h3>
        <div className="flex justify-between items-center py-2">
          <div className="text-[#A1A1AA] text-sm">
            supply APR (with incentives)
          </div>
          <div className="flex items-center gap-2">
            {hasSupplyBonuses && (
              <SquarePlus className="w-4 h-4 text-green-500" />
            )}
            {hasMixedIncentives && (
              <SquareEqual className="w-4 h-4 text-indigo-500" />
            )}
            <span className="text-sm font-semibold font-mono text-green-400">
              {formatPercentage(finalAPY)}
            </span>
          </div>
        </div>
      </div>

      {/* Collateral Parameters */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          collateral parameters
        </h3>
        <InfoRow
          label="can be collateral?"
          value={supplyInfo.canBeCollateral ? "yes" : "no"}
          tooltip="whether this asset can be used as collateral for borrowing"
        />
        {supplyInfo.canBeCollateral && (
          <>
            <InfoRow
              label="max LTV"
              value={formatPercentage(supplyInfo.maxLTV.value)}
              tooltip="maximum loan-to-value ratio - the max amount you can borrow against this collateral"
            />
            <InfoRow
              label="liquidation threshold"
              value={formatPercentage(supplyInfo.liquidationThreshold.value)}
              tooltip="threshold at which your position becomes liquidatable"
            />
            <InfoRow
              label="liquidation penalty"
              value={formatPercentage(supplyInfo.liquidationBonus.value)}
              tooltip="bonus received by liquidators when liquidating this asset"
            />
          </>
        )}
      </div>

      {/* Market Status */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3">market status</h3>
        <div className="flex flex-wrap gap-2">
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
          {!market.isFrozen && !market.isPaused && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
              active
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
              {incentive.__typename.includes("Supply") && (
                <span>supply bonus available</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplyInfoTab;
