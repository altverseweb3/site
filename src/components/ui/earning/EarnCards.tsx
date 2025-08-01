"use client";

import React from "react";
import { EarnTableRow, DashboardTableRow, EarnTableType } from "@/types/earn";
import EarnCard from "@/components/ui/earning/EarnCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface EarnCardsProps {
  type: EarnTableType;
  data: EarnTableRow[] | DashboardTableRow[];
  onDetails?: (row: EarnTableRow | DashboardTableRow) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

const EarnCards: React.FC<EarnCardsProps> = ({
  type,
  data,
  onDetails,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, data.length);

  return (
    <div className="w-full">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        {data.map((row) => (
          <EarnCard key={row.id} type={type} data={row} onDetails={onDetails} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t border-[#27272A] gap-4">
          <div className="text-sm text-[#A1A1AA] order-2 sm:order-1">
            showing {startItem}-{endItem} of {totalItems} results
          </div>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]"
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show current page and 2 pages on each side, or first/last 5
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
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className={cn(
                      "w-8 h-8 p-0",
                      page === currentPage
                        ? "bg-amber-500/25 text-amber-500 border-[#61410B] hover:bg-amber-500/50 hover:text-amber-400"
                        : "border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]",
                    )}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarnCards;
