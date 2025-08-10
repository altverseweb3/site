import { UserPosition, UserBorrowPosition } from "@/types/aave";

// Position USD Calculation Utilities
export function calculateUserSupplyPositionsUSD(
  userSupplyPositions: UserPosition[],
  oraclePrices: Record<string, number>,
): (UserPosition & { suppliedBalanceUSD: string })[] {
  return userSupplyPositions.map((position) => {
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
}

export function calculateUserBorrowPositionsUSD(
  userBorrowPositions: UserBorrowPosition[],
  oraclePrices: Record<string, number>,
): (UserBorrowPosition & { totalDebtUSD: string })[] {
  return userBorrowPositions.map((position) => {
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
}

// Aave uses RAY decimal precision (1e27) for all interest rate calculations.
// This means: 1% APY = 0.01e27 = 10000000000000000000000000
export function rayToPercentage(rayValue: string): string {
  const RAY = Math.pow(10, 27);
  const SECONDS_PER_YEAR = 31536000;
  const rayValueInDecimals = Number(rayValue) / RAY;
  const aaveAPY =
    (Math.pow(1 + rayValueInDecimals / SECONDS_PER_YEAR, SECONDS_PER_YEAR) -
      1) *
    100;
  return Number(aaveAPY).toFixed(2);
}

// Health Factor Color Helper
export function getHealthFactorColor(healthFactor: number | null): string {
  if (healthFactor === null) return "text-white";
  if (healthFactor === Infinity) return "text-green-500";
  if (healthFactor >= 2) return "text-green-500";
  if (healthFactor >= 1.5) return "text-yellow-500";
  if (healthFactor >= 1.1) return "text-orange-500";
  return "text-red-500";
}

// LTV Color Helper (returns color names)
export function getLTVColor(
  ltv: number,
  liquidationThresh: number,
): "green" | "yellow" | "amber" | "red" {
  if (liquidationThresh === 0) return "green";
  const usage = ltv / liquidationThresh;
  if (usage < 0.6) return "green";
  if (usage < 0.8) return "yellow";
  if (usage < 0.95) return "amber";
  return "red";
}

// LTV Color Helper (returns CSS classes)
export function getLTVColorClass(
  currentLTV: number,
  liquidationThreshold: number,
): string {
  if (currentLTV < liquidationThreshold * 0.7) return "text-green-500";
  if (currentLTV < liquidationThreshold * 0.9) return "text-amber-500";
  return "text-red-500";
}

/**
 * Get transaction button styling and text based on validation state
 * @param isSubmitting - Whether the transaction is being submitted
 * @param isHighRiskTransaction - Whether this is a high-risk transaction
 * @param acceptHighRisk - Whether user has accepted the high-risk warning
 * @param validationRiskLevel - Risk level from transaction validation
 * @param actionText - Default action text (e.g., "withdraw", "borrow")
 * @returns Object with buttonClassName, textClassName, and buttonText
 */
export function getTransactionButtonStyle(
  isSubmitting: boolean,
  isHighRiskTransaction: boolean,
  acceptHighRisk: boolean,
  validationRiskLevel?: "liquidation" | "high" | "moderate" | "safe",
  actionText: string = "submit",
): {
  buttonClassName: string;
  textClassName: string;
  buttonText: string;
} {
  const isHighRiskLevel =
    validationRiskLevel === "liquidation" || validationRiskLevel === "high";

  const buttonClassName = isHighRiskLevel
    ? "border-red-500/25 bg-red-500/10 hover:bg-red-500/20"
    : "";

  const textClassName = isHighRiskLevel ? "text-red-500" : "";

  let buttonText: string;
  if (isSubmitting) {
    buttonText = `${actionText}ing...`;
  } else if (isHighRiskTransaction && !acceptHighRisk) {
    buttonText = "high risk - blocked";
  } else if (isHighRiskTransaction && acceptHighRisk) {
    buttonText = `high risk ${actionText}`;
  } else {
    buttonText = actionText;
  }

  return {
    buttonClassName,
    textClassName,
    buttonText,
  };
}

/**
 * Get transaction warning message for different actions
 * @param actionType - Type of action (withdraw, borrow, supply, repay)
 * @returns Warning message string
 */
export function getTransactionWarningText(
  actionType: "withdraw" | "borrow" | "supply" | "repay",
): string {
  switch (actionType) {
    case "withdraw":
      return "by withdrawing, you will reduce your earning potential and may affect your borrowing capacity.";
    case "borrow":
      return "by borrowing, you will pay interest at the variable rate. ensure you can repay to avoid liquidation.";
    case "supply":
      return "by supplying, you agree to Aave's terms and conditions. your supply will start earning yield immediately.";
    case "repay":
      return "by repaying, you will reduce your debt and improve your health factor.";
    default:
      return "please review the transaction details carefully before proceeding.";
  }
}

// Health Factor Calculator for Transaction Impact
export function calculateNewHealthFactor(
  currentHealthFactor: number,
  currentCollateralUSD: number,
  currentDebtUSD: number,
  transactionAmountUSD: number,
  transactionType: string,
  liquidationThreshold: number,
): number {
  let newDebtUSD = currentDebtUSD;

  switch (transactionType) {
    case "borrow":
      newDebtUSD += transactionAmountUSD;
      break;
    case "repay":
      newDebtUSD = Math.max(0, newDebtUSD - transactionAmountUSD);
      break;
    default:
      return currentHealthFactor;
  }

  if (newDebtUSD === 0) return Infinity;

  if (currentHealthFactor === Infinity && currentDebtUSD === 0) {
    if (transactionType === "borrow") {
      const liquidationThresholdDecimal =
        liquidationThreshold > 1
          ? liquidationThreshold / 100
          : liquidationThreshold;
      const weightedCollateral =
        currentCollateralUSD * liquidationThresholdDecimal;
      return weightedCollateral / newDebtUSD;
    }
    return Infinity;
  }

  const weightedCollateral = currentHealthFactor * currentDebtUSD;
  return weightedCollateral / newDebtUSD;
}
