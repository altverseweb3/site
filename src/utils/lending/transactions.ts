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

const getTransactionKey = (transaction: UserTransactionItem): string => {
  let chainName: string;
  let underlyingTokenAddress = "";

  if (isUserLiquidationCallTransaction(transaction)) {
    chainName = transaction.collateral.reserve.market.chain.name;
    underlyingTokenAddress =
      transaction.collateral.reserve.underlyingToken.address;
  } else if (hasReserve(transaction)) {
    chainName = transaction.reserve.market.chain.name;
    underlyingTokenAddress = transaction.reserve.underlyingToken.address;
  } else {
    chainName = "unknown";
  }

  return `${transaction.txHash}-${chainName}-${transaction.timestamp}-${transaction.__typename}-${underlyingTokenAddress}`;
};

const getReserveInfo = (transaction: UserTransactionItem) => {
  if (!hasReserve(transaction)) {
    return {
      market: "UNKNOWN",
      assetSymbol: "UNKNOWN",
      assetImageUrl: "",
      chainSymbol: "UNKNOWN",
      chainIconUrl: "",
    };
  }

  return {
    market: transaction.reserve?.market?.name || "UNKNOWN",
    assetSymbol: transaction.reserve?.underlyingToken?.symbol || "UNKNOWN",
    assetImageUrl: transaction.reserve?.underlyingToken?.imageUrl || "",
    chainSymbol: transaction.reserve?.market?.chain?.name || "UNKNOWN",
    chainIconUrl: transaction.reserve?.market?.chain?.icon || "",
  };
};

export {
  getTransactionAmount,
  getTransactionLabel,
  formatTransactionAmount,
  formatTransactionUsdValue,
  getTransactionKey,
  getReserveInfo,
  isUserBorrowTransaction,
  isUserWithdrawTransaction,
  isUserRepayTransaction,
  isUserUsageAsCollateralTransaction,
  isUserLiquidationCallTransaction,
};
