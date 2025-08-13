import { UserPosition, UserBorrowPosition } from "@/types/aave";

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
        `No liquidation threshold data for ${position.asset.asset.ticker}, excluding from health factor calculation`,
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
  let totalSupplyEarningsBP = 0; // in basis points
  let totalBorrowCostsBP = 0;
  let totalSuppliedUSD = 0;
  let totalBorrowedUSD = 0;

  userSupplyPositions.forEach((position) => {
    const suppliedUSD = parseFloat(position.suppliedBalanceUSD || "0");
    const supplyAPY = parseFloat(position.asset.supplyAPY || "0");

    // Convert to basis points: 4.32% → 432 basis points
    const earningsBP = suppliedUSD * supplyAPY * 100;
    totalSupplyEarningsBP += earningsBP;
    totalSuppliedUSD += suppliedUSD;
  });

  userBorrowPositions.forEach((position) => {
    const borrowedUSD = parseFloat(position.totalDebtUSD || "0");
    const borrowAPY = parseFloat(position.asset.variableBorrowAPY || "0");

    const costsBP = borrowedUSD * borrowAPY * 100;
    totalBorrowCostsBP += costsBP;
    totalBorrowedUSD += borrowedUSD;
  });

  const netWorth = totalSuppliedUSD - totalBorrowedUSD;
  if (Math.abs(netWorth) < 0.0001) return 0;

  // Calculate in basis points, then convert back to percentage
  const netEarningsBP = totalSupplyEarningsBP - totalBorrowCostsBP;
  return netEarningsBP / (netWorth * 100); // Converts back to percentage
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
          `Missing LTV/liquidation threshold data for ${position.asset.asset.ticker}, excluding from LTV calculation`,
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

/**
 * Calculate the maximum amount in USD that can be borrowed while maintaining a 1.12 health factor
 * @param totalCollateralUSD - Total collateral value in USD
 * @param totalDebtUSD - Total debt value in USD
 * @param liquidationThreshold - Weighted liquidation threshold (as decimal, e.g., 0.85 for 85%)
 * @returns Maximum borrowable amount in USD
 */
export const calculateMaxBorrowUSD = (
  totalCollateralUSD: number,
  totalDebtUSD: number,
  liquidationThreshold: number,
): number => {
  if (totalCollateralUSD <= 0) return 0;

  const liquidationThresholdDecimal =
    liquidationThreshold > 1
      ? liquidationThreshold / 100
      : liquidationThreshold;
  const weightedCollateral = totalCollateralUSD * liquidationThresholdDecimal;
  const maxTotalDebt = weightedCollateral / 1.12; // Allow exactly 1.12 HF
  const maxNewBorrowUSD = Math.max(0, maxTotalDebt - totalDebtUSD);

  return maxNewBorrowUSD;
};

/**
 * Calculate new health factor after a borrow transaction
 * @param totalCollateralUSD - Current total collateral value in USD
 * @param totalDebtUSD - Current total debt value in USD
 * @param borrowAmountUSD - Amount to be borrowed in USD
 * @param liquidationThreshold - Weighted liquidation threshold (as decimal or percentage)
 * @returns New health factor after the borrow transaction
 */
export const calculateNewHealthFactorAfterBorrow = (
  totalCollateralUSD: number,
  totalDebtUSD: number,
  borrowAmountUSD: number,
  liquidationThreshold: number,
): number => {
  const liquidationThresholdDecimal =
    liquidationThreshold > 1
      ? liquidationThreshold / 100
      : liquidationThreshold;

  const weightedCollateral = totalCollateralUSD * liquidationThresholdDecimal;
  const newTotalDebt = totalDebtUSD + borrowAmountUSD;

  return newTotalDebt > 0 ? weightedCollateral / newTotalDebt : Infinity;
};

/**
 * Determine if a transaction is high risk based on the resulting health factor
 * @param healthFactor - The resulting health factor after transaction
 * @returns True if the transaction is high risk (HF between 1.1 and 1.2)
 */
export const isHighRiskTransaction = (healthFactor: number): boolean => {
  return healthFactor < 1.2 && healthFactor > 1.1;
};

/**
 * Determine if a transaction would result in liquidation risk
 * @param healthFactor - The resulting health factor after transaction
 * @returns True if the transaction has liquidation risk (HF < 1.1)
 */
export const isLiquidationRisk = (healthFactor: number): boolean => {
  return healthFactor < 1.1;
};

/**
 * Convert USD amount to token amount with proper formatting
 * @param amountUSD - Amount in USD
 * @param tokenPrice - Price of the token in USD
 * @param decimals - Number of decimal places for formatting (default: 4)
 * @returns Formatted token amount as string
 */
export const convertUSDToTokenAmount = (
  amountUSD: number,
  tokenPrice: number,
  decimals: number = 4,
): string => {
  if (tokenPrice <= 0) return "0";
  return (amountUSD / tokenPrice).toFixed(decimals);
};

/**
 * Format number to first 3 significant figures that show up
 * @param num - Number to format
 * @returns Formatted string with appropriate decimal places
 */
export const formatToSignificantFigures = (num: number): string => {
  if (num === 0) return "0";

  // Get the number of digits before decimal point
  const magnitude = Math.floor(Math.log10(Math.abs(num)));

  if (magnitude >= 2) {
    // For numbers >= 100, show no decimals
    return num.toFixed(0);
  } else if (magnitude >= 0) {
    // For numbers >= 1, show 2 decimal places
    return num.toFixed(2);
  } else {
    // For numbers < 1, show enough decimals to get 3 significant figures
    const decimals = Math.abs(magnitude) + 2;
    return num.toFixed(Math.min(decimals, 8)); // Cap at 8 decimals
  }
};

/**
 * Calculate borrowing metrics including max borrow amount with precise formatting
 * @param userSupplyPositions - User's supply positions with USD values
 * @param userBorrowPositions - User's borrow positions with USD values
 * @param tokenPrice - Price of the token to borrow in USD
 * @param stableBorrowAPY - Stable borrow APY as string percentage
 * @param oraclePrices - Oracle prices for all assets
 * @returns Object containing currentMetrics, maxBorrowUSD, maxBorrowAmount, and isStableRateAvailable
 */
export const calculateBorrowingMetrics = (
  userSupplyPositions: UserPosition[],
  userBorrowPositions: UserBorrowPosition[],
  tokenPrice: number,
  stableBorrowAPY: string,
  oraclePrices: Record<string, number> = {},
): {
  currentMetrics: UserMetrics | null;
  maxBorrowUSD: number;
  maxBorrowAmount: string;
  isStableRateAvailable: boolean;
} => {
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

  const currentMetrics = calculateUserMetrics(
    userSupplyPositionsUSD,
    userBorrowPositionsUSD,
  );

  const maxBorrowUSD = currentMetrics
    ? calculateMaxBorrowUSD(
        currentMetrics.totalCollateralUSD,
        currentMetrics.totalDebtUSD,
        currentMetrics.liquidationThreshold,
      )
    : 0;

  // Use toPrecision for better formatting instead of toFixed
  const maxBorrowTokenAmount = tokenPrice > 0 ? maxBorrowUSD / tokenPrice : 0;
  const maxBorrowAmount =
    maxBorrowTokenAmount > 0
      ? parseFloat(maxBorrowTokenAmount.toPrecision(6)).toString()
      : "0";

  const isStableRateAvailable = parseFloat(stableBorrowAPY) > 0;

  return {
    currentMetrics,
    maxBorrowUSD,
    maxBorrowAmount,
    isStableRateAvailable,
  };
};

/**
 * Calculate withdraw transaction impact on health factor and LTV
 * @param isCollateral - Whether the asset being withdrawn is used as collateral
 * @param currentMetrics - Current user metrics (health factor, LTV, etc.)
 * @param withdrawAmountUSD - Amount being withdrawn in USD
 * @param liquidationThreshold - Liquidation threshold as decimal (e.g., 0.85)
 * @returns Object with newHealthFactor, newLTV, and isHighRiskTransaction
 */
export const calculateWithdrawImpact = (
  isCollateral: boolean,
  currentMetrics: UserMetrics,
  withdrawAmountUSD: number,
  liquidationThreshold: number = 0.85,
): {
  newHealthFactor: number;
  newLTV: number;
  isHighRiskTransaction: boolean;
} => {
  let newHealthFactor = currentMetrics.healthFactor || Infinity;
  let newLTV = currentMetrics.currentLTV;
  let isHighRiskTransaction = false;

  if (isCollateral && currentMetrics.totalDebtUSD > 0) {
    // Only calculate impact if this is a collateral asset and user has debt
    const newTotalCollateral = Math.max(
      0,
      currentMetrics.totalCollateralUSD - withdrawAmountUSD,
    );
    const liquidationThresholdDecimal =
      liquidationThreshold > 1
        ? liquidationThreshold / 100
        : liquidationThreshold;
    const newWeightedCollateral =
      newTotalCollateral * liquidationThresholdDecimal;
    newHealthFactor = newWeightedCollateral / currentMetrics.totalDebtUSD;
    newLTV =
      newTotalCollateral > 0
        ? (currentMetrics.totalDebtUSD / newTotalCollateral) * 100
        : currentMetrics.totalDebtUSD > 0
          ? 100
          : 0;
    // Allow risk acceptance for any transaction that would result in HF < 1.2 (including liquidation level)
    isHighRiskTransaction = newHealthFactor < 1.2;
  }

  return {
    newHealthFactor,
    newLTV,
    isHighRiskTransaction,
  };
};

/**
 * Calculate collateral enable/disable impact on health factor and LTV
 * @param isCurrentlyCollateral - Whether the asset is currently used as collateral
 * @param currentMetrics - Current user metrics (health factor, LTV, etc.)
 * @param actualUSDValue - USD value of the asset being enabled/disabled as collateral
 * @param liquidationThreshold - Liquidation threshold as decimal (e.g., 0.85)
 * @returns Object with newHealthFactor, newLTV, and isHighRiskTransaction
 */
export const calculateCollateralImpact = (
  isCurrentlyCollateral: boolean,
  currentMetrics: UserMetrics,
  actualUSDValue: number,
  liquidationThreshold: number = 0.85,
): {
  newHealthFactor: number;
  newLTV: number;
  isHighRiskTransaction: boolean;
} => {
  let newHealthFactor = currentMetrics.healthFactor || Infinity;
  let newLTV = currentMetrics.currentLTV;
  let isHighRiskTransaction = false;

  if (currentMetrics.totalDebtUSD > 0) {
    const newTotalCollateral = isCurrentlyCollateral
      ? Math.max(0, currentMetrics.totalCollateralUSD - actualUSDValue)
      : currentMetrics.totalCollateralUSD + actualUSDValue;

    const liquidationThresholdDecimal =
      liquidationThreshold > 1
        ? liquidationThreshold / 100
        : liquidationThreshold;
    const newWeightedCollateral =
      newTotalCollateral * liquidationThresholdDecimal;
    newHealthFactor = newWeightedCollateral / currentMetrics.totalDebtUSD;
    newLTV =
      newTotalCollateral > 0
        ? (currentMetrics.totalDebtUSD / newTotalCollateral) * 100
        : currentMetrics.totalDebtUSD > 0
          ? 100
          : 0;

    isHighRiskTransaction = newHealthFactor < 1.2;
  }

  return {
    newHealthFactor,
    newLTV,
    isHighRiskTransaction,
  };
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
