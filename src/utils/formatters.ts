import { FormattedNumberParts } from "@/types/ui";

// Format number in balances to look compact with string/hex handling and error handling
export const formatBalance = (
  balance: string | number,
  precision: number = 4,
): string => {
  try {
    let numericBalance: string;

    if (typeof balance === "number") {
      numericBalance = balance.toString();
    } else {
      numericBalance = balance;
      // Handle hex strings that start with "0x"
      if (typeof balance === "string" && balance.startsWith("0x")) {
        numericBalance = BigInt(balance).toString();
      }
    }

    const num = Number(numericBalance);

    if (isNaN(num)) {
      return "0.000000";
    }

    // Handle abbreviations for large numbers - use toPrecision for better formatting
    if (num >= 1e12) {
      const abbreviated = num / 1e12;
      return parseFloat(abbreviated.toPrecision(precision)).toString() + "T";
    } else if (num >= 1e9) {
      const abbreviated = num / 1e9;
      return parseFloat(abbreviated.toPrecision(precision)).toString() + "B";
    } else if (num >= 1e6) {
      const abbreviated = num / 1e6;
      return parseFloat(abbreviated.toPrecision(precision)).toString() + "M";
    } else if (num >= 1) {
      // Between 1 and 999,999 - use toPrecision for cleaner display
      return parseFloat(num.toPrecision(precision + 2)).toString();
    } else if (num === 0) {
      // Exactly zero
      return "0";
    } else {
      // Small fractions - use toPrecision for significant figures
      if (num < 1e-4) {
        return parseFloat(
          num.toPrecision(Math.max(3, precision - 1)),
        ).toString();
      } else {
        return parseFloat(num.toPrecision(precision)).toString();
      }
    }
  } catch (e) {
    console.error("Error formatting number:", e);
    return "0.000000";
  }
};

export const truncateAddress = (
  address: string,
  start: number = 6,
  end: number = 4,
): string => {
  if (!address) return "";
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

export function formatCurrency(value: number): string {
  if (value === 0) return "$0";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${Number(value).toFixed(2)}`;
}

export const formatPercentage = (apy: number | string): string => {
  // Handle null, undefined, or zero cases
  if (apy === null || apy === undefined) {
    return "--";
  }

  // Convert to number if it's a string
  const numericAPY = typeof apy === "string" ? parseFloat(apy) : apy;

  // Handle invalid conversions or zero after parsing
  if (isNaN(numericAPY)) {
    return "--";
  }

  // If the input was a string (likely a decimal rate), convert to percentage
  if (typeof apy === "string") {
    return `${(numericAPY * 100).toFixed(2)}%`;
  }

  // If the input was a number (likely already a percentage), format directly
  return `${numericAPY.toFixed(2)}%`;
};

export const formatNetAPY = (netAPY: number | null): string => {
  if (netAPY === null) return "--";
  return netAPY.toFixed(2);
};

export const formatNetWorth = (netWorth: number): string => {
  if (netWorth === 0) return "--";
  return netWorth.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatHealthFactor = (
  healthFactor: number | string | null,
): { value: string; colorClass: string } => {
  if (healthFactor === null) {
    return { value: "--", colorClass: "text-gray-400" };
  }

  if (healthFactor === "mixed") {
    return { value: "mixed", colorClass: "text-amber-400" };
  }

  const numericValue =
    typeof healthFactor === "string" ? parseFloat(healthFactor) : healthFactor;

  if (numericValue === Infinity) {
    return { value: "∞", colorClass: "text-green-400" };
  }

  const formattedValue = numericValue.toFixed(2);
  const colorClass = numericValue < 1.5 ? "text-red-400" : "text-green-400";

  return { value: formattedValue, colorClass };
};

export const calculateUSDValue = (
  balance: string | number,
  price?: number,
  fallbackUSD?: string | number,
): string => {
  if (!price) {
    return fallbackUSD ? fallbackUSD.toString() : "0.00";
  }

  const numericBalance = parseFloat(balance.toString() || "0");
  const calculatedValue = numericBalance * price;

  return parseFloat(calculatedValue.toPrecision(4)).toString();
};

/**
 * Get the effective token price from token.priceUsd or fallback tokenPrice.
 * @param token - Token object with potential priceUsd property
 * @param tokenPrice - Fallback token price
 * @returns Effective token price to use for calculations
 */
export const getEffectiveTokenPrice = (
  token: { priceUsd?: string | number },
  tokenPrice?: number,
): number => {
  return token.priceUsd ? Number(token.priceUsd) : tokenPrice || 0;
};

/**
 * Calculate USD value for repay modal amounts using consistent pricing
 * @param amount - Token amount as string or number
 * @param token - Token object with potential priceUsd property
 * @param tokenPrice - Fallback token price
 * @returns USD value rounded to 2 decimal places
 */
export const calculateRepayUSDValue = (
  amount: string | number,
  token: { priceUsd?: string | number; address: string },
  oraclePrices?: Record<string, number>,
): number => {
  const amountNum = parseFloat(amount.toString()) || 0;

  // Try token.priceUsd first, then oracle prices, then fallback to 0
  const price = token.priceUsd
    ? Number(token.priceUsd)
    : oraclePrices?.[token.address.toLowerCase()] || 0;

  return amountNum * price;
};

/**
 * Format USD amount with proper decimal places for display
 * @param amount - USD amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted USD string
 */
export const formatUSDAmount = (
  amount: number,
  decimals: number = 4,
): string => {
  return amount.toPrecision(decimals);
};

export const formatDate = (timestamp: string) => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const parseDecimalNumberToSubscript = (
  value: string | number,
): FormattedNumberParts => {
  const originalValue = value.toString();

  if (!value || isNaN(parseFloat(originalValue))) {
    return {
      hasSubscript: false,
      subscriptCount: 0,
      remainingDigits: originalValue,
      originalValue,
    };
  }

  // Return empty string for zero values
  if (parseFloat(originalValue) === 0) {
    return {
      hasSubscript: false,
      subscriptCount: 0,
      remainingDigits: "",
      originalValue,
    };
  }

  // Work directly with the original string to avoid scientific notation conversion
  const match = originalValue.match(/^0\.0+/);

  if (match) {
    const zeroCount = match[0].length - 2; // Subtract "0."

    // Only use subscript notation if more than 4 zeros
    if (zeroCount > 4) {
      let remainingDigits = originalValue.slice(match[0].length);

      // Limit to 2 decimal places for subscripted numbers
      remainingDigits = remainingDigits.slice(0, 2);

      return {
        hasSubscript: true,
        subscriptCount: zeroCount,
        remainingDigits,
        originalValue,
      };
    }
  }

  // For regular numbers, limit to 4 decimal places
  const num = parseFloat(originalValue);
  const formattedNum = parseFloat(num.toFixed(4)).toString();

  return {
    hasSubscript: false,
    subscriptCount: 0,
    remainingDigits: formattedNum,
    originalValue,
  };
};
