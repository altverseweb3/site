import {
  TokenAmount,
  UserTransactionItem,
  UserSupplyTransaction,
  UserBorrowTransaction,
  UserWithdrawTransaction,
  UserRepayTransaction,
  UserUsageAsCollateralTransaction,
  UserLiquidationCallTransaction,
} from "@/types/aave";
import { formatBalance, formatCurrency } from "@/utils/formatters";

/**
 * Type Guards - since we don't know what type UserTransactionItem is at runtime
 */
const isUserSupplyTransaction = (
  tx: UserTransactionItem,
): tx is UserSupplyTransaction => tx.__typename === "UserSupplyTransaction";

const isUserWithdrawTransaction = (
  tx: UserTransactionItem,
): tx is UserWithdrawTransaction => tx.__typename === "UserWithdrawTransaction";

const isUserBorrowTransaction = (
  tx: UserTransactionItem,
): tx is UserBorrowTransaction => tx.__typename === "UserBorrowTransaction";

const isUserRepayTransaction = (
  tx: UserTransactionItem,
): tx is UserRepayTransaction => tx.__typename === "UserRepayTransaction";

const isUserUsageAsCollateralTransaction = (
  tx: UserTransactionItem,
): tx is UserUsageAsCollateralTransaction =>
  tx.__typename === "UserUsageAsCollateralTransaction";

const isUserLiquidationCallTransaction = (
  tx: UserTransactionItem,
): tx is UserLiquidationCallTransaction =>
  tx.__typename === "UserLiquidationCallTransaction";

type TransactionWithAmount =
  | UserSupplyTransaction
  | UserWithdrawTransaction
  | UserBorrowTransaction
  | UserRepayTransaction;

const hasAmount = (tx: UserTransactionItem): tx is TransactionWithAmount =>
  isUserSupplyTransaction(tx) ||
  isUserWithdrawTransaction(tx) ||
  isUserBorrowTransaction(tx) ||
  isUserRepayTransaction(tx);

type TransactionWithReserve =
  | UserSupplyTransaction
  | UserWithdrawTransaction
  | UserBorrowTransaction
  | UserRepayTransaction
  | UserUsageAsCollateralTransaction;

const hasReserve = (tx: UserTransactionItem): tx is TransactionWithReserve =>
  isUserSupplyTransaction(tx) ||
  isUserWithdrawTransaction(tx) ||
  isUserBorrowTransaction(tx) ||
  isUserRepayTransaction(tx) ||
  isUserUsageAsCollateralTransaction(tx);

const getTransactionAmount = (
  transaction: UserTransactionItem,
): TokenAmount | null => {
  if (!hasAmount(transaction)) {
    return null;
  }
  return transaction.amount;
};

const getTransactionLabel = (transaction: UserTransactionItem): string => {
  switch (transaction.__typename) {
    case "UserSupplyTransaction":
      return "supply";
    case "UserWithdrawTransaction":
      return "withdraw";
    case "UserBorrowTransaction":
      return "borrow";
    case "UserRepayTransaction":
      return "repay";
    case "UserUsageAsCollateralTransaction":
      return transaction.enabled ? "enable collateral" : "disable collateral";
    case "UserLiquidationCallTransaction":
      return "liquidation";
    default:
      return "transaction";
  }
};

const formatTransactionAmount = (
  amount: TokenAmount | undefined | null,
): string => {
  if (!amount) return "--";
  return formatBalance(amount.amount.value);
};

const formatTransactionUsdValue = (
  amount: TokenAmount | undefined | null,
): string => {
  if (!amount?.usd) return "--";
  return formatCurrency(amount.usd);
};

const getReserveInfo = (transaction: UserTransactionItem) => {
  if (!hasReserve(transaction)) {
    return {
      symbol: "UNKNOWN",
      imageUrl: "",
    };
  }

  return {
    symbol: transaction.reserve?.underlyingToken?.symbol || "UNKNOWN",
    imageUrl: transaction.reserve?.underlyingToken?.imageUrl || "",
  };
};

export {
  getTransactionAmount,
  getTransactionLabel,
  formatTransactionAmount,
  formatTransactionUsdValue,
  getReserveInfo,
  isUserBorrowTransaction,
  isUserWithdrawTransaction,
  isUserRepayTransaction,
  isUserUsageAsCollateralTransaction,
  isUserLiquidationCallTransaction,
};
