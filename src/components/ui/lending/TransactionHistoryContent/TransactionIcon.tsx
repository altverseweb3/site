import {
  ArrowUp,
  ArrowDown,
  Coins,
  RefreshCw,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { UserTransactionItem } from "@/types/aave";

export const TransactionIcon: React.FC<{
  transaction: UserTransactionItem;
}> = ({ transaction }) => {
  switch (transaction.__typename) {
    case "UserSupplyTransaction":
      return <ArrowUp className="h-4 w-4 text-green-500" />;
    case "UserWithdrawTransaction":
      return <ArrowDown className="h-4 w-4 text-red-500" />;
    case "UserBorrowTransaction":
      return <Coins className="h-4 w-4 text-sky-500" />;
    case "UserRepayTransaction":
      return <RefreshCw className="h-4 w-4 text-amber-500" />;
    case "UserUsageAsCollateralTransaction":
      return (
        <Shield
          className={`h-4 w-4 ${transaction.enabled ? "text-amber-500" : "text-sky-500"}`}
        />
      );
    case "UserLiquidationCallTransaction":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return <Coins className="h-4 w-4 text-zinc-500" />;
  }
};

export default TransactionIcon;
