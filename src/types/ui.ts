export type Tab = "swap" | "earn" | "lending" | "dashboard";
export type Theme = "light" | "dark";
export type AvailableIconName =
  | "Coins"
  | "Cable"
  | "Wallet"
  | "ArrowLeftRight"
  | "TrendingUp"
  | "TrendingDown";
export interface FormattedNumberParts {
  hasSubscript: boolean;
  subscriptCount: number;
  remainingDigits: string;
  originalValue: string;
}
