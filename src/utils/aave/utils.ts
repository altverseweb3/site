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

// LTV Color Helper
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
