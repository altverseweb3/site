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
