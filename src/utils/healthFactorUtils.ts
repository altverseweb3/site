// Health factor utility functions

/**
 * Formats health factor for display
 * Shows ∞ symbol for values >= 1000
 */
export const formatHealthFactor = (healthFactor: string | number): string => {
  const hf =
    typeof healthFactor === "string" ? parseFloat(healthFactor) : healthFactor;

  if (isNaN(hf) || !isFinite(hf) || hf >= 1000) {
    return "∞";
  }

  return hf.toFixed(2);
};

/**
 * Gets health factor color based on value
 */
export const getHealthFactorColor = (healthFactor: string | number): string => {
  const hf =
    typeof healthFactor === "string" ? parseFloat(healthFactor) : healthFactor;

  if (isNaN(hf) || !isFinite(hf) || hf >= 1000) {
    return "text-green-400"; // Infinite/very high = safe
  }

  if (hf >= 2) return "text-green-400"; // Safe
  if (hf >= 1.5) return "text-yellow-400"; // Moderate
  if (hf >= 1.1) return "text-orange-400"; // Risky
  return "text-red-400"; // Dangerous
};

/**
 * Checks if health factor is safe
 */
export const isHealthFactorSafe = (healthFactor: string | number): boolean => {
  const hf =
    typeof healthFactor === "string" ? parseFloat(healthFactor) : healthFactor;
  return isNaN(hf) || !isFinite(hf) || hf >= 1.1;
};
