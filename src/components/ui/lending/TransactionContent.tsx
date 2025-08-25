import CardsList from "@/components/ui/CardsList";
import TransactionCard from "@/components/ui/lending/TransactionCard";
import TransactionTable from "@/components/ui/lending/TransactionTable";
import { PaginatedUserTransactionHistoryResult } from "@aave/react";

interface HistoryContentProps {
  data: PaginatedUserTransactionHistoryResult | undefined;
  loading: boolean;
}

const HistoryContent = ({ data, loading }: HistoryContentProps) => {
  if (loading) {
    return (<div className="text-center py-16">
      <div className="text-[#A1A1AA]">loading transaction history...</div>
    </div>)
  }
  
  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">no transaction history found</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <TransactionTable transactions={data.items} />
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        <CardsList
          data={data.items}
          renderCard={(transaction) => (
            <TransactionCard
              key={`${transaction.txHash.toString()}-${transaction.timestamp.toString()}`}
              transaction={transaction}
            />
          )}
          gridCols="grid-cols-1"
          currentPage={1}
          totalPages={1}
          onPageChange={() => {}}
          itemsPerPage={data.items.length}
          totalItems={data.items.length}
        />
      </div>
    </div>
  );
};

export default HistoryContent;
