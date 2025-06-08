/**
 * Utility functions for formatting numbers and currencies
 */

/**
 * Format large numbers with K, M, B suffixes
 */
export const formatLargeNumber = (
  num: number | string,
  decimals: number = 2,
): string => {
  const value = typeof num === "string" ? parseFloat(num) : num;

  if (isNaN(value) || !isFinite(value)) {
    return "0.00";
  }

  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(decimals)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(decimals)}M`;
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(decimals)}K`;
  }

  return value.toFixed(decimals);
};

/**
 * Format currency with proper decimal places and K/M/B suffixes
 */
export const formatCurrency = (
  num: number | string,
  decimals: number = 2,
): string => {
  const value = typeof num === "string" ? parseFloat(num) : num;

  if (isNaN(value) || !isFinite(value)) {
    return "$0.00";
  }

  return `$${formatLargeNumber(value, decimals)}`;
};

/**
 * Format token balance with appropriate precision
 */
export const formatTokenBalance = (
  balance: number | string,
  decimals: number = 6,
): string => {
  const value = typeof balance === "string" ? parseFloat(balance) : balance;

  if (isNaN(value) || !isFinite(value)) {
    return "0.00";
  }

  // For very small numbers, show more decimals
  if (value < 0.01 && value > 0) {
    return value.toFixed(8);
  }

  // For regular numbers, use K/M/B formatting
  if (value >= 1000) {
    return formatLargeNumber(value, 2);
  }

  return value.toFixed(decimals);
};

/**
 * Format percentage values
 */
export const formatPercentage = (
  num: number | string,
  decimals: number = 2,
): string => {
  const value = typeof num === "string" ? parseFloat(num) : num;

  if (isNaN(value) || !isFinite(value)) {
    return "0.00%";
  }

  return `${value.toFixed(decimals)}%`;
};

/**
 * Format health factor with infinite symbol
 */
export const formatHealthFactor = (healthFactor: string | number): string => {
  const hf =
    typeof healthFactor === "string" ? parseFloat(healthFactor) : healthFactor;

  if (isNaN(hf) || !isFinite(hf) || hf >= 1000) {
    return "∞";
  }

  if (hf === 0) {
    return "0.00";
  }

  return hf.toFixed(2);
};

/**
 * Get health factor color based on value
 */
export const getHealthFactorColor = (healthFactor: string | number): string => {
  const hf =
    typeof healthFactor === "string" ? parseFloat(healthFactor) : healthFactor;

  if (isNaN(hf) || !isFinite(hf) || hf >= 1000) {
    return "text-gray-400";
  }

  if (hf >= 2) return "text-green-400";
  if (hf >= 1.5) return "text-yellow-400";
  if (hf >= 1.1) return "text-orange-400";
  return "text-red-400";
};
