import { UserTransactionItem } from "@/types/aave";
import { formatDate } from "@/utils/formatters";
import {
  getReserveInfo,
  getTransactionAmount,
  getTransactionLabel,
  formatTransactionAmount,
  formatTransactionUsdValue,
  getTransactionKey,
} from "@/utils/lending/transactions";
import TransactionIcon from "@/components/ui/lending/TransactionIcon";
import Image from "next/image";

const TransactionTable: React.FC<{ transactions: UserTransactionItem[] }> = ({
  transactions,
}) => {
  const tableHeaderClass = `px-4 py-2 text-left text-sm font-semibold text-zinc-300 lowercase tracking-wider`;

  return (
    <div className="w-full overflow-hidden">
      <table className="w-full">
        <thead className="bg-zinc-800/90 border-b border-[#27272A]">
          <tr>
            <th className={tableHeaderClass}>type</th>
            <th className={tableHeaderClass}>asset</th>
            <th className={tableHeaderClass}>market</th>
            <th className={`${tableHeaderClass} text-right`}>amount</th>
            <th className={`${tableHeaderClass} text-right`}>value</th>
            <th className={tableHeaderClass}>date</th>
            <th className={`${tableHeaderClass} text-center`}>tx</th>
          </tr>
        </thead>
        <tbody className="bg-[#18181B] divide-y divide-[#27272A]">
          {transactions.map((transaction) => {
            const reserveInfo = getReserveInfo(transaction);
            const amount = getTransactionAmount(transaction);

            return (
              <tr
                key={getTransactionKey(transaction)}
                className="hover:bg-[#1C1C1F] transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <TransactionIcon transaction={transaction} />
                    <span className="text-[#FAFAFA] text-sm">
                      {getTransactionLabel(transaction)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
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
                    <span className="text-[#FAFAFA] font-mono uppercase text-sm">
                      {reserveInfo.assetSymbol}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3 text-right">
                  <span className="text-[#FAFAFA] font-mono text-sm">
                    {formatTransactionAmount(amount)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-[#A1A1AA] font-mono text-sm">
                    {formatTransactionUsdValue(amount)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[#A1A1AA] text-sm font-mono">
                    {formatDate(transaction.timestamp)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
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
