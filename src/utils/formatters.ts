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
  return `$${value.toFixed(2)}`;
}

export const formatAPY = (apy: number | string): string => {
  // Handle null, undefined, or zero cases
  if (apy === null || apy === undefined || apy === 0 || apy === "0") {
    return "TBD";
  }

  // Convert to number if it's a string
  const numericAPY = typeof apy === "string" ? parseFloat(apy) : apy;

  // Handle invalid conversions or zero after parsing
  if (isNaN(numericAPY) || numericAPY === 0) {
    return "TBD";
  }

  // If the input was a string (likely a decimal rate), convert to percentage
  if (typeof apy === "string") {
    return `${(numericAPY * 100).toFixed(1)}%`;
  }

  // If the input was a number (likely already a percentage), format directly
  return `${numericAPY.toFixed(1)}%`;
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

export const formatHealthFactor = (healthFactor: number | null): string => {
  if (healthFactor === null) return "--";
  if (healthFactor === Infinity) return "∞";
  return healthFactor.toFixed(2);
};
