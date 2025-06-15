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

export const formatLargeNumber = (num: number): string => {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toString();
};

export const truncateAddress = (
  address: string,
  start: number = 6,
  end: number = 4,
): string => {
  if (!address) return "";
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};
