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

//Extract a user-friendly error message from deposit-related blockchain errors

//Truncates error messages to 200-300 character limit for better UX

function truncateMessage(message: string): string {
  const MAX_LENGTH = 300;
  const MIN_LENGTH = 200;

  if (message.length <= MAX_LENGTH) {
    return message;
  }

  // Try to find a good break point (sentence, word boundary) within the limit
  const truncated = message.substring(0, MAX_LENGTH);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("!"),
    truncated.lastIndexOf("?"),
  );

  // If we found a sentence boundary after MIN_LENGTH, use it
  if (lastSentenceEnd > MIN_LENGTH) {
    return message.substring(0, lastSentenceEnd + 1);
  }

  // Otherwise, find the last word boundary
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > MIN_LENGTH) {
    return message.substring(0, lastSpace) + "...";
  }

  // Fallback to hard truncation
  return message.substring(0, MAX_LENGTH) + "...";
}

export function parseDepositError(error: unknown): string {
  // Default fallback message
  const friendlyMessage = "Something went wrong with your deposit";

  try {
    if (!error) return friendlyMessage;

    // Convert to string for easier parsing
    const errorString = JSON.stringify(error);

    // Try to extract common error patterns
    const patterns = [
      // User rejection errors - CHECK FIRST to avoid false matches with gas/fee keywords
      {
        regex:
          /user rejected action|ethers-user-denied|User rejected the request|user denied/i,
        message: "Transaction was cancelled by user",
      },
      // Balance errors
      {
        regex: /transfer amount exceeds balance/i,
        message: "Insufficient token balance for this deposit",
      },
      // More specific gas errors (removed "execution reverted")
      {
        regex:
          /insufficient funds|gas required exceeds allowance|out of gas|gas limit|transaction underpriced|max fee per gas|base fee/i,
        message: "Not enough ETH to cover gas fees",
      },
      // Approval errors
      {
        regex: /allowance|approve|permission|ERC20: insufficient allowance/i,
        message: "Token approval required. Please try again.",
      },
      // Timeout errors
      {
        regex: /timeout|timed? out|expired/i,
        message: "Request timed out. Please try again.",
      },
      // Generic execution reverted
      {
        regex: /execution reverted/i,
        message:
          "Smart contract call failed. Please check your transaction details and try again.",
      },
    ];

    // Check for specific error patterns
    for (const pattern of patterns) {
      if (pattern.regex.test(errorString)) {
        return truncateMessage(pattern.message);
      }
    }

    // Extract reason if present (common in revert errors)
    const reasonMatch = /reason="([^"]+)"/.exec(errorString);
    if (reasonMatch && reasonMatch[1]) {
      return truncateMessage(reasonMatch[1]);
    }

    // Extract message if present
    const messageMatch = /"message":"([^"]+)"/.exec(errorString);
    if (messageMatch && messageMatch[1]) {
      return truncateMessage(messageMatch[1]);
    }

    // If error is actually an Error object
    if (error instanceof Error) {
      return truncateMessage(error.message);
    }

    // If error is a string
    if (typeof error === "string") {
      return truncateMessage(error);
    }

    return friendlyMessage;
  } catch (e) {
    console.error("Error parsing deposit error:", e);
    return friendlyMessage;
  }
}

export function parseSwapError(error: unknown): string {
  // Default fallback message
  const friendlyMessage = "Something went wrong with your swap";

  try {
    if (!error) return friendlyMessage;

    // Convert to string for easier parsing
    const errorString = JSON.stringify(error);

    // Try to extract common error patterns
    const patterns = [
      // User rejection errors - CHECK FIRST to avoid false matches with gas/fee keywords
      {
        regex:
          /user rejected action|ethers-user-denied|User rejected the request|user denied|User denied transaction signature/i,
        message: "Transaction was cancelled by user",
      },
      // Balance errors
      {
        regex: /transfer amount exceeds balance/i,
        message: "Insufficient token balance for this swap",
      },
      // Slippage errors
      {
        regex:
          /slippage|price impact|price too low|min.*?received|output.*?amount/i,
        message:
          "Price moved too much during the swap. Try increasing slippage tolerance.",
      },
      // More specific gas errors (avoid matching user rejection)
      {
        regex:
          /insufficient funds|gas required exceeds allowance|out of gas|gas limit|transaction underpriced|max fee per gas|base fee/i,
        message: "Not enough ETH to cover gas fees",
      },
      // Approval errors
      {
        regex: /allowance|approve|permission|ERC20: insufficient allowance/i,
        message: "Token approval required. Please try again.",
      },
      // Timeout errors
      {
        regex: /timeout|timed? out|expired/i,
        message: "Request timed out. Please try again.",
      },
    ];

    // Check for specific error patterns
    for (const pattern of patterns) {
      if (pattern.regex.test(errorString)) {
        return truncateMessage(pattern.message);
      }
    }

    // Extract reason if present (common in revert errors)
    const reasonMatch = /reason="([^"]+)"/.exec(errorString);
    if (reasonMatch && reasonMatch[1]) {
      return truncateMessage(reasonMatch[1]);
    }

    // Extract message if present
    const messageMatch = /"message":"([^"]+)"/.exec(errorString);
    if (messageMatch && messageMatch[1]) {
      return truncateMessage(messageMatch[1]);
    }

    // If error is actually an Error object
    if (error instanceof Error) {
      return truncateMessage(error.message);
    }

    // If error is a string
    if (typeof error === "string") {
      return truncateMessage(error);
    }

    return friendlyMessage;
  } catch (e) {
    console.error("Error parsing swap error:", e);
    return friendlyMessage;
  }
}
