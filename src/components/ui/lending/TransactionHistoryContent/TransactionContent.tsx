"use client";
import React, { useState } from "react";
import CardsList from "@/components/ui/CardsList";
import TransactionCard from "@/components/ui/lending/TransactionHistoryContent/TransactionCard";
import TransactionTable from "@/components/ui/lending/TransactionHistoryContent/TransactionTable";
import { UserTransactionItem } from "@/types/aave";
import { getTransactionKey } from "@/utils/lending/transactions";

const ITEMS_PER_PAGE = 10;

interface HistoryContentProps {
  data: UserTransactionItem[] | undefined;
  loading: boolean;
}

const HistoryContent: React.FC<HistoryContentProps> = ({ data, loading }) => {
  const [currentPage, setCurrentPage] = useState(1);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">loading transaction history...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">no transaction history found</div>
      </div>
    );
  }

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const paginatedData = data.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <TransactionTable transactions={paginatedData} />

        {/* Desktop Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t border-[#27272A] gap-4">
            <div className="text-sm text-[#A1A1AA] order-2 sm:order-1">
              showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, data.length)} of{" "}
              {data.length} results
            </div>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 text-sm rounded ${
                        page === currentPage
                          ? "bg-amber-500/25 text-amber-500 border border-[#61410B]"
                          : "border border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden">
        <CardsList
          data={data}
          renderCard={(transaction) => (
            <TransactionCard
              key={getTransactionKey(transaction)}
              transaction={transaction}
            />
          )}
          gridCols="grid-cols-1"
        />
      </div>
    </div>
  );
};

export default HistoryContent;
