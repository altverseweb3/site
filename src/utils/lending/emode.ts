import {
  UnifiedReserveData,
  EmodeMarketCategory,
  UserSupplyData,
} from "@/types/aave";

export function calculateWeightedLiquidationThreshold(
  market: UnifiedReserveData,
  marketSupplyData: Record<string, UserSupplyData>,
  emodeCategory: EmodeMarketCategory | null = null,
): number {
  // Get supply positions for this specific market using chainId-market address key
  const marketKey = `${market.marketInfo.chain.chainId}-${market.marketInfo.address}`;
  const userSupplyForMarket = marketSupplyData[marketKey];

  // If no supply data for this market, return 0
  if (
    !userSupplyForMarket ||
    !userSupplyForMarket.supplies ||
    userSupplyForMarket.supplies.length === 0
  ) {
    return 0;
  }

  const userSupplyPositions = userSupplyForMarket.supplies;

  let totalWeightedThreshold = 0;
  let totalPositionValue = 0;

  userSupplyPositions.forEach((position) => {
    const positionValueUsd = parseFloat(position.balance.usd) || 0;

    if (positionValueUsd <= 0) {
      return; // Skip positions with no value
    }

    let liquidationThreshold = 0;

    // Determine liquidation threshold based on E-mode status
    if (emodeCategory && emodeCategory.reserves) {
      // Check if this reserve is in the E-mode category
      const reserveInEmode = emodeCategory.reserves.find(
        (reserve) =>
          reserve.underlyingToken.address.toLowerCase() ===
          position.currency.address.toLowerCase(),
      );

      if (reserveInEmode) {
        // Use E-mode liquidation threshold
        liquidationThreshold =
          parseFloat(emodeCategory.liquidationThreshold.value) || 0;
      } else {
        // Reserve not in E-mode, use regular threshold from market supply reserves
        const marketReserve = market.marketInfo.supplyReserves.find(
          (reserve) =>
            reserve.underlyingToken.address.toLowerCase() ===
            position.currency.address.toLowerCase(),
        );

        if (marketReserve && marketReserve.supplyInfo) {
          liquidationThreshold =
            parseFloat(marketReserve.supplyInfo.liquidationThreshold.value) ||
            0;
        }
      }
    } else {
      // No E-mode active, use regular threshold from market supply reserves
      const marketReserve = market.marketInfo.supplyReserves.find(
        (reserve) =>
          reserve.underlyingToken.address.toLowerCase() ===
          position.currency.address.toLowerCase(),
      );

      if (marketReserve && marketReserve.supplyInfo) {
        liquidationThreshold =
          parseFloat(marketReserve.supplyInfo.liquidationThreshold.value) || 0;
      }
    }

    totalWeightedThreshold += liquidationThreshold * positionValueUsd;
    totalPositionValue += positionValueUsd;
  });

  // Return weighted average (avoid division by zero)
  return totalPositionValue > 0
    ? totalWeightedThreshold / totalPositionValue
    : 0;
}

export function calculateNewHealthFactor(
  market: UnifiedReserveData,
  marketSupplyData: Record<string, UserSupplyData>,
  newEmodeCategory: EmodeMarketCategory | null = null,
): number {
  // Get market user state
  const userState = market.marketInfo.userState;

  if (!userState) {
    return 0;
  }

  // Get total collateral value (TCV) and total debt value (TBV)
  const totalCollateralBase = parseFloat(userState.totalCollateralBase) || 0;
  const totalDebtBase = parseFloat(userState.totalDebtBase) || 0;

  // If no debt, health factor is effectively infinite (return a large number)
  if (totalDebtBase <= 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  // Calculate weighted liquidation threshold with new E-mode category
  const weightedLiquidationThreshold = calculateWeightedLiquidationThreshold(
    market,
    marketSupplyData,
    newEmodeCategory,
  );

  // Health Factor = (wLT * TCV) / TBV
  return (weightedLiquidationThreshold * totalCollateralBase) / totalDebtBase;
}
