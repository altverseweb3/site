import { UserPosition, UserBorrowPosition } from "./fetch";

export interface UserMetrics {
  netWorth: number;
  netAPY: number | null;
  healthFactor: number | null;
  totalCollateralUSD: number;
  totalDebtUSD: number;
  currentLTV: number;
  maxLTV: number;
  liquidationThreshold: number;
}

export const calculateNetWorth = (
  userSupplyPositions: UserPosition[],
  userBorrowPositions: UserBorrowPosition[],
): number => {
  const totalSuppliedUSD = userSupplyPositions.reduce((sum, position) => {
    return sum + parseFloat(position.suppliedBalanceUSD || "0");
  }, 0);

  const totalBorrowedUSD = userBorrowPositions.reduce((sum, position) => {
    return sum + parseFloat(position.totalDebtUSD || "0");
  }, 0);

  return totalSuppliedUSD - totalBorrowedUSD;
};

export const calculateHealthFactor = (
  userSupplyPositions: UserPosition[],
  userBorrowPositions: UserBorrowPosition[],
): number | null => {
  let totalCollateralWeighted = 0;
  let totalDebtUSD = 0;

  userSupplyPositions.forEach((position) => {
    const suppliedUSD = parseFloat(position.suppliedBalanceUSD || "0");

    // Use liquidation threshold from asset data
    let liquidationThreshold = 0;
    if (position.asset.liquidationThreshold) {
      liquidationThreshold =
        typeof position.asset.liquidationThreshold === "string"
          ? parseFloat(position.asset.liquidationThreshold.replace("%", ""))
          : position.asset.liquidationThreshold;
    } else {
      // Skip assets without liquidation threshold data
      console.warn(
        `No liquidation threshold data for ${position.asset.symbol}, excluding from health factor calculation`,
      );
      return;
    }

    // Only count collateral positions in health factor
    if (position.isCollateral) {
      const liquidationThresholdDecimal =
        liquidationThreshold > 1
          ? liquidationThreshold / 100
          : liquidationThreshold;
      totalCollateralWeighted += suppliedUSD * liquidationThresholdDecimal;
    }
  });

  userBorrowPositions.forEach((position) => {
    totalDebtUSD += parseFloat(position.totalDebtUSD || "0");
  });

  if (totalDebtUSD === 0) return Infinity;
  return totalCollateralWeighted / totalDebtUSD;
};

export const calculateWeightedNetAPY = (
  userSupplyPositions: UserPosition[],
  userBorrowPositions: UserBorrowPosition[],
): number | null => {
  let totalSupplyEarnings = 0;
  let totalBorrowCosts = 0;
  let totalSuppliedUSD = 0;
  let totalBorrowedUSD = 0;

  userSupplyPositions.forEach((position) => {
    const suppliedUSD = parseFloat(position.suppliedBalanceUSD || "0");
    const supplyAPY = parseFloat(position.asset.supplyAPY || "0");
    const earnings = suppliedUSD * (supplyAPY / 100);

    totalSupplyEarnings += earnings;
    totalSuppliedUSD += suppliedUSD;
  });

  userBorrowPositions.forEach((position) => {
    const borrowedUSD = parseFloat(position.totalDebtUSD || "0");
    const borrowAPY = parseFloat(position.asset.variableBorrowAPY || "0");
    const cost = borrowedUSD * (borrowAPY / 100);

    totalBorrowCosts += cost;
    totalBorrowedUSD += borrowedUSD;
  });

  const netWorth = totalSuppliedUSD - totalBorrowedUSD;
  if (netWorth === 0) return 0;

  return ((totalSupplyEarnings - totalBorrowCosts) / netWorth) * 100;
};

export const calculateLTVData = (
  userSupplyPositions: UserPosition[],
  userBorrowPositions: UserBorrowPosition[],
): { currentLTV: number; maxLTV: number; liquidationThreshold: number } => {
  const totalBorrowedUSD = userBorrowPositions.reduce((sum, position) => {
    return sum + parseFloat(position.totalDebtUSD || "0");
  }, 0);

  let weightedMaxLTV = 0;
  let weightedLiquidationThreshold = 0;
  let totalCollateralValue = 0;

  userSupplyPositions.forEach((position) => {
    if (position.isCollateral) {
      const suppliedUSD = parseFloat(position.suppliedBalanceUSD || "0");

      const assetLTV =
        typeof position.asset.ltv === "string"
          ? parseFloat(position.asset.ltv.replace("%", ""))
          : position.asset.ltv || 0;

      let assetLiqThreshold = 0;
      if (position.asset.liquidationThreshold) {
        assetLiqThreshold =
          typeof position.asset.liquidationThreshold === "string"
            ? parseFloat(position.asset.liquidationThreshold.replace("%", ""))
            : position.asset.liquidationThreshold;
      }

      // Skip assets without proper LTV/liquidation threshold data
      if (!assetLTV || !assetLiqThreshold) {
        console.warn(
          `Missing LTV/liquidation threshold data for ${position.asset.symbol}, excluding from LTV calculation`,
        );
        return;
      }

      const assetLTVDecimal = assetLTV > 1 ? assetLTV / 100 : assetLTV;
      const assetLiqThresholdDecimal =
        assetLiqThreshold > 1 ? assetLiqThreshold / 100 : assetLiqThreshold;

      weightedMaxLTV += suppliedUSD * assetLTVDecimal;
      weightedLiquidationThreshold += suppliedUSD * assetLiqThresholdDecimal;
      totalCollateralValue += suppliedUSD;
    }
  });

  const maxLTV =
    totalCollateralValue > 0
      ? (weightedMaxLTV / totalCollateralValue) * 100
      : 0;
  const liquidationThreshold =
    totalCollateralValue > 0
      ? (weightedLiquidationThreshold / totalCollateralValue) * 100
      : 0;
  const currentLTV =
    totalCollateralValue > 0
      ? (totalBorrowedUSD / totalCollateralValue) * 100
      : 0;

  return { currentLTV, maxLTV, liquidationThreshold };
};

export const calculateUserMetrics = (
  userSupplyPositions: UserPosition[],
  userBorrowPositions: UserBorrowPosition[],
): UserMetrics => {
  const netWorth = calculateNetWorth(userSupplyPositions, userBorrowPositions);
  const netAPY = calculateWeightedNetAPY(
    userSupplyPositions,
    userBorrowPositions,
  );
  const healthFactor = calculateHealthFactor(
    userSupplyPositions,
    userBorrowPositions,
  );
  const ltvData = calculateLTVData(userSupplyPositions, userBorrowPositions);

  // Calculate total collateral USD (only positions used as collateral)
  const totalCollateralUSD = userSupplyPositions.reduce((sum, position) => {
    if (position.isCollateral) {
      return sum + parseFloat(position.suppliedBalanceUSD || "0");
    }
    return sum;
  }, 0);

  const totalDebtUSD = userBorrowPositions.reduce((sum, position) => {
    return sum + parseFloat(position.totalDebtUSD || "0");
  }, 0);

  return {
    netWorth,
    netAPY,
    healthFactor,
    totalCollateralUSD,
    totalDebtUSD,
    currentLTV: ltvData.currentLTV,
    maxLTV: ltvData.maxLTV,
    liquidationThreshold: ltvData.liquidationThreshold,
  };
};
