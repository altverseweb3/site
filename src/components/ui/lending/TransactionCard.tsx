import { UserTransactionItem } from "@/types/aave";
import { formatDate } from "@/utils/formatters";
import TransactionIcon from "@/components/ui/lending/TransactionIcon";
import {
  getReserveInfo,
  getTransactionAmount,
  getTransactionLabel,
  formatTransactionAmount,
  formatTransactionUsdValue,
  isUserLiquidationCallTransaction,
} from "@/utils/lending/transactions";
import Image from "next/image";

export const TransactionCard: React.FC<{
  transaction: UserTransactionItem;
}> = ({ transaction }) => {
  const reserveInfo = getReserveInfo(transaction);
  const amount = getTransactionAmount(transaction);

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-lg p-4 hover:border-[#3A3A3D] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <TransactionIcon transaction={transaction} />
          <div>
            <div className="font-medium text-white">
              {getTransactionLabel(transaction)}
            </div>
            <div className="text-sm text-[#A1A1AA] font-mono">
              {formatDate(transaction.timestamp)}
            </div>
          </div>
        </div>
        <div className="text-right">
          {amount && (
            <>
              <div className="font-medium font-mono text-white">
                {formatTransactionAmount(amount)}
              </div>
              <div className="text-sm font-mono text-[#A1A1AA]">
                {formatTransactionUsdValue(amount)}
              </div>
            </>
          )}
          {isUserLiquidationCallTransaction(transaction) && (
            <div className="text-sm text-red-500">liquidation event</div>
          )}
        </div>
      </div>

      {/* Asset and Market Info */}
      <div className="flex items-center justify-between text-sm mb-2">
        <div className="flex items-center gap-2">
          <Image
            src={reserveInfo.assetImageUrl}
            alt={reserveInfo.assetSymbol}
            height={32}
            width={32}
            className="w-5 h-5 rounded-full"
            onError={(e) => {
              e.currentTarget.src = "/images/tokens/default.svg";
            }}
          />
          <span className="text-[#A1A1AA] font-mono uppercase">
            {reserveInfo.assetSymbol}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Image
            src={reserveInfo.chainIconUrl}
            alt={reserveInfo.chainSymbol}
            height={20}
            width={20}
            className="w-4 h-4 rounded-full"
            onError={(e) => {
              e.currentTarget.src = "/images/chains/default.svg";
            }}
          />
          <span className="text-[#A1A1AA] text-xs">{reserveInfo.market}</span>
        </div>
      </div>

      {/* Transaction Link */}
      <div className="flex justify-end">
        <a
          href={transaction.blockExplorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 transition-colors text-sm"
        >
          view transaction ↗
        </a>
      </div>
    </div>
  );
};

export default TransactionCard;
