// Format number in balances to look compact with string/hex handling and error handling
export const formatBalance = (
  balance: string | number,
  decimals = 2,
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

    // Handle abbreviations for large numbers
    if (num >= 1e12) {
      return (num / 1e12).toFixed(decimals) + "T";
    } else if (num >= 1e9) {
      return (num / 1e9).toFixed(decimals) + "B";
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(decimals) + "M";
    } else if (num >= 1) {
      // Between 1 and 999,999 - show 3 decimal places
      return num.toFixed(3);
    } else if (num === 0) {
      // Exactly zero
      return "0.000";
    } else {
      // Small fractions - use more decimal places but cap at 6
      if (num < 1e-4) {
        return num.toFixed(6);
      } else if (num < 1e-2) {
        return num.toFixed(5);
      } else {
        return num.toFixed(4);
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
