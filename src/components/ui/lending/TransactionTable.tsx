import { UserTransactionItem } from "@/types/aave";
import { formatDate } from "@/utils/formatters";
import {
  getReserveInfo,
  getTransactionAmount,
  getTransactionLabel,
  formatTransactionAmount,
  formatTransactionUsdValue,
} from "@/utils/lending/transactions";
import TransactionIcon from "@/components/ui/lending/TransactionIcon";
import Image from "next/image";

const TransactionTable: React.FC<{ transactions: UserTransactionItem[] }> = ({
  transactions,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#27272A]">
            <th className="text-left py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              type
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              asset
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              market
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              amount
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              value
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              date
            </th>
            <th className="text-center py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              tx
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const reserveInfo = getReserveInfo(transaction);
            const amount = getTransactionAmount(transaction);

            return (
              <tr
                key={transaction.txHash}
                className="border-b border-[#27272A]/50 hover:bg-[#27272A]/20 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <TransactionIcon transaction={transaction} />
                    <span className="text-white text-sm">
                      {getTransactionLabel(transaction)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
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
                    <span className="text-white font-mono uppercase text-sm">
                      {reserveInfo.assetSymbol}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
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
                    <span className="text-[#A1A1AA] text-sm">
                      {reserveInfo.market}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-white font-mono text-sm">
                    {formatTransactionAmount(amount)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-[#A1A1AA] font-mono text-sm">
                    {formatTransactionUsdValue(amount)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[#A1A1AA] text-sm font-mono">
                    {formatDate(transaction.timestamp)}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <a
                    href={transaction.blockExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 transition-colors text-sm"
                  >
                    ↗
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
