"use client";

import { ReactElement, useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Hook to calculate viewport-based rows to prevent scrolling
const useViewportBasedRows = (
  cardRef: React.RefObject<HTMLDivElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
) => {
  const [optimalRows, setOptimalRows] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);

  const calculateOptimalRows = useCallback(() => {
    if (!cardRef.current || !containerRef.current) {
      return;
    }

    try {
      const cardElement = cardRef.current;
      const containerElement = containerRef.current;
      const cardHeight = cardElement.getBoundingClientRect().height;
      const cardGap = 16;

      // Get the actual available height by measuring the container's viewport space
      const containerRect = containerElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate how much space is available from the container's top to the bottom of viewport
      const availableHeight = viewportHeight - containerRect.top - 100; // buffer for pagination/footer
      const possibleRows = Math.floor(availableHeight / (cardHeight + cardGap));
      const finalRows = Math.max(1, possibleRows);

      setOptimalRows(finalRows);
      setIsCalculating(false);
    } catch (error) {
      console.error("Error calculating optimal rows:", error);
      setOptimalRows(3);
      setIsCalculating(false);
    }
  }, [cardRef, containerRef]);

  useEffect(() => {
    // Try immediate calculation first
    calculateOptimalRows();

    // If still calculating, set up a more aggressive retry schedule
    if (isCalculating) {
      const timers = [
        setTimeout(calculateOptimalRows, 50),
        setTimeout(calculateOptimalRows, 100),
        setTimeout(calculateOptimalRows, 200),
      ];

      // Fallback after reasonable time
      const fallbackTimer = setTimeout(() => {
        if (optimalRows === null) {
          setOptimalRows(3);
          setIsCalculating(false);
        }
      }, 500);

      return () => {
        timers.forEach(clearTimeout);
        clearTimeout(fallbackTimer);
      };
    }

    // Recalculate on window resize
    const handleResize = () => {
      setIsCalculating(true);
      calculateOptimalRows();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [calculateOptimalRows, isCalculating, optimalRows]);

  // Return fallback during calculation to prevent flash
  return optimalRows ?? 3;
};

// Hook to calculate responsive items per page based on grid columns
const useResponsiveItemsPerPage = (gridCols: string, rows: number) => {
  const [itemsPerPage, setItemsPerPage] = useState(rows * 4); // Default to 4 columns

  useEffect(() => {
    const calculateItemsPerPage = () => {
      const width = window.innerWidth;
      let columns: number;

      // Parse the gridCols string to determine breakpoints
      if (gridCols.includes("xl:grid-cols-4") && width >= 1280) {
        columns = 4;
      } else if (gridCols.includes("xl:grid-cols-3") && width >= 1280) {
        columns = 3;
      } else if (gridCols.includes("xl:grid-cols-2") && width >= 1280) {
        columns = 2;
      } else if (gridCols.includes("xl:grid-cols-1") && width >= 1280) {
        columns = 1;
      } else if (gridCols.includes("lg:grid-cols-4") && width >= 1024) {
        columns = 4;
      } else if (gridCols.includes("lg:grid-cols-3") && width >= 1024) {
        columns = 3;
      } else if (gridCols.includes("lg:grid-cols-2") && width >= 1024) {
        columns = 2;
      } else if (gridCols.includes("lg:grid-cols-1") && width >= 1024) {
        columns = 1;
      } else if (gridCols.includes("sm:grid-cols-4") && width >= 640) {
        columns = 4;
      } else if (gridCols.includes("sm:grid-cols-3") && width >= 640) {
        columns = 3;
      } else if (gridCols.includes("sm:grid-cols-2") && width >= 640) {
        columns = 2;
      } else if (gridCols.includes("sm:grid-cols-1") && width >= 640) {
        columns = 1;
      } else {
        // Default to mobile breakpoint
        if (gridCols.includes("grid-cols-4")) columns = 4;
        else if (gridCols.includes("grid-cols-3")) columns = 3;
        else if (gridCols.includes("grid-cols-2")) columns = 2;
        else columns = 1;
      }

      setItemsPerPage(columns * rows);
    };

    calculateItemsPerPage();
    window.addEventListener("resize", calculateItemsPerPage);
    return () => window.removeEventListener("resize", calculateItemsPerPage);
  }, [gridCols, rows]);

  return itemsPerPage;
};

interface CardsListProps<T> {
  data: T[];
  renderCard: (item: T) => ReactElement;
  gridCols?: string;
  className?: string;
}

const CardsList = <T,>({
  data,
  renderCard,
  gridCols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  className,
}: CardsListProps<T>) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const optimalRows = useViewportBasedRows(cardRef, containerRef);
  const itemsPerPage = useResponsiveItemsPerPage(gridCols, optimalRows);
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Reset to page 1 when items per page changes (screen resize)
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Calculate paginated data
  const paginatedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={cn("w-full", className)} ref={containerRef}>
      {/* Cards Grid */}
      <div className={cn("grid gap-4 p-4", gridCols)}>
        {paginatedData.map((item, index) => (
          <div key={index} ref={index === 0 ? cardRef : undefined}>
            {renderCard(item)}
          </div>
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
              onClick={() => setCurrentPage(currentPage - 1)}
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
                    onClick={() => setCurrentPage(page)}
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
              onClick={() => setCurrentPage(currentPage + 1)}
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

export default CardsList;
