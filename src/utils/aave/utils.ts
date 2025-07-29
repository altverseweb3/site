// formatUtils.ts
export const formatAPY = (rate: string): string => {
  const percentage = (parseFloat(rate) * 100).toFixed(2);
  return percentage;
};

export const formatBalance = (balance: string): string => {
  const formatted = parseFloat(balance);
  if (formatted === 0) return "0.00";
  if (formatted < 0.01) return "<0.01";
  return formatted.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};

export const formatCurrency = (
  amount: string | number,
  currency: string = "USD",
): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatPercentage = (
  value: number,
  decimals: number = 2,
): string => {
  return `${value.toFixed(decimals)}%`;
};

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
export function getHealthFactorColor(healthFactor: number): string {
  if (healthFactor >= 2) return "text-green-500";
  if (healthFactor >= 1.5) return "text-yellow-500";
  if (healthFactor >= 1.1) return "text-orange-500";
  return "text-red-500";
}
