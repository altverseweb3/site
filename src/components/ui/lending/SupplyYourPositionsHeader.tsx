import React from "react";
import { UserPosition, UserBorrowPosition } from "@/types/aave";
import { calculateUserMetrics } from "@/utils/aave/metricsCalculations";
import { getHealthFactorColor } from "@/utils/aave/utils";
import { formatCurrency } from "@/utils/formatters";
import { TokenImage } from "@/components/ui/TokenImage";
import { getChainByChainId } from "@/config/chains";

interface SupplyYourPositionsHeaderProps {
  userSupplyPositions?: UserPosition[];
  userBorrowPositions?: UserBorrowPosition[];
  oraclePrices?: Record<string, number>;
}

const SupplyYourPositionsHeader: React.FC<SupplyYourPositionsHeaderProps> = ({
  userSupplyPositions = [],
  userBorrowPositions = [],
  oraclePrices = {},
  ...props
}) => {
  // Calculate USD positions using oracle prices
  const userSupplyPositionsUSD = userSupplyPositions.map((position) => {
    const suppliedBalance = parseFloat(position.suppliedBalance || "0");
    const oraclePrice =
      oraclePrices[position.asset.asset.address.toLowerCase()];
    return {
      ...position,
      suppliedBalanceUSD:
        oraclePrice !== undefined
          ? (suppliedBalance * oraclePrice).toString()
          : "0.00",
    };
  });

  const userBorrowPositionsUSD = userBorrowPositions.map((position) => {
    const formattedTotalDebt = parseFloat(position.formattedTotalDebt || "0");
    const oraclePrice =
      oraclePrices[position.asset.asset.address.toLowerCase()];
    return {
      ...position,
      totalDebtUSD:
        oraclePrice !== undefined
          ? (formattedTotalDebt * oraclePrice).toString()
          : "0.00",
    };
  });

  // Calculate metrics
  const metrics = calculateUserMetrics(
    userSupplyPositionsUSD,
    userBorrowPositionsUSD,
  );

  // Calculate total invested (total supplied balance)
  const totalInvested = userSupplyPositionsUSD.reduce((sum, position) => {
    return sum + parseFloat(position.suppliedBalanceUSD || "0");
  }, 0);

  // Calculate collateral value (only positions used as collateral)
  const collateralValue = userSupplyPositionsUSD.reduce((sum, position) => {
    if (position.isCollateral) {
      return sum + parseFloat(position.suppliedBalanceUSD || "0");
    }
    return sum;
  }, 0);

  // Calculate weighted APY for supply positions
  const weightedAPY = (() => {
    if (totalInvested === 0) return 0;

    let totalEarnings = 0;
    userSupplyPositionsUSD.forEach((position) => {
      const positionValue = parseFloat(position.suppliedBalanceUSD || "0");
      const supplyAPY = parseFloat(position.asset.supplyAPY || "0");
      totalEarnings += positionValue * (supplyAPY / 100);
    });

    return totalInvested > 0 ? (totalEarnings / totalInvested) * 100 : 0;
  })();

  // Create asset data from user positions for TokenImage components
  const assets = userSupplyPositions.map((position, index) => ({
    id: index + 1,
    token: position.asset.asset,
    chain: getChainByChainId(position.asset.asset.chainId),
  }));

  // Define how many tokens to show before using "+X more"
  const visibleTokens = 3;
  const remainingTokens =
    assets.length > visibleTokens ? assets.length - visibleTokens : 0;

  return (
    <div className="w-full" {...props}>
      {/* Mobile Layout - Two rows */}
      <div className="md:hidden py-3">
        {/* First row: Title and chevron */}
        <div className="flex items-center justify-between mb-2 pr-6">
          <div className="w-40 flex-shrink-0 pl-6">
            <span className="text-base font-bold text-white">
              your positions
            </span>
          </div>
          {/* Space for chevron */}
          <div className="w-6 h-6 flex items-center justify-center">
            {/* Chevron will be added by parent component */}
          </div>
        </div>

        {/* Second row: Info badges */}
        <div className="flex items-center justify-center gap-2 px-6">
          <div className="rounded px-2 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>invested</span>
            <span className="text-white">{formatCurrency(totalInvested)}</span>
          </div>

          <div className="rounded px-2 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>balance</span>
            <span className="text-white">{formatCurrency(totalInvested)}</span>
          </div>

          <div className="rounded px-2 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>APY</span>
            <span className="text-white">{weightedAPY.toFixed(2)}%</span>
          </div>

          <div className="rounded px-2 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>collateral</span>
            <span className="text-white">
              {formatCurrency(collateralValue)}
            </span>
          </div>

          <div className="rounded px-2 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>health factor</span>
            <span className={getHealthFactorColor(metrics.healthFactor)}>
              {metrics.healthFactor === null ||
              metrics.healthFactor === Infinity
                ? "∞"
                : metrics.healthFactor.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Original horizontal layout */}
      <div className="hidden md:flex items-center h-[65px]" {...props}>
        {/* Title - fixed width with more padding */}
        <div className="w-40 flex-shrink-0 pl-6">
          <span className="text-base font-bold text-white">your positions</span>
        </div>

        {/* Info badges - centered in the remaining space */}
        <div className="flex-grow flex justify-center items-center">
          <div className="flex items-center gap-2">
            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
              <span>invested</span>
              <span className="text-white">
                {formatCurrency(totalInvested)}
              </span>
            </div>

            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
              <span>balance</span>
              <span className="text-white">
                {formatCurrency(totalInvested)}
              </span>
            </div>

            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
              <span>APY</span>
              <span className="text-white">{weightedAPY.toFixed(2)}%</span>
            </div>

            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
              <span>collateral</span>
              <span className="text-white">
                {formatCurrency(collateralValue)}
              </span>
            </div>

            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
              <span>health factor</span>
              <span className={getHealthFactorColor(metrics.healthFactor)}>
                {metrics.healthFactor === null ||
                metrics.healthFactor === Infinity
                  ? "∞"
                  : metrics.healthFactor.toFixed(2)}
              </span>
            </div>

            {/* Asset tokens */}
            <div className="rounded px-3 py-1 flex items-center text-xs border h-6 border-zinc-800 w-[112px] overflow-hidden">
              <div className="flex -space-x-2 items-center">
                {assets.slice(0, visibleTokens).map((asset) => (
                  <TokenImage
                    key={asset.id}
                    token={asset.token}
                    chain={asset.chain}
                    size="sm"
                  />
                ))}
              </div>
              {remainingTokens > 0 && (
                <span className="text-[10px] text-white/50 whitespace-nowrap ml-1">
                  +{remainingTokens} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Space for chevron - prevents content from pushing it */}
        <div className="w-12 flex-shrink-0"></div>
      </div>
    </div>
  );
};

export default SupplyYourPositionsHeader;
