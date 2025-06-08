import React from "react";

interface BorrowAvailablePositionsHeaderProps {
  totalBorrowed?: number;
  averageBorrowAPY?: number;
  loading?: boolean;
  availableAssets?: Array<{
    address: string;
    symbol: string;
    totalBorrowed?: string | number;
    variableBorrowAPY?: string | number;
    borrowAPY?: string | number;
    priceUSD?: number;
    oraclePrice?: number;
  }>;
}

const BorrowAvailablePositionsHeader: React.FC<
  BorrowAvailablePositionsHeaderProps
> = ({
  totalBorrowed,
  averageBorrowAPY,
  loading = false,
  availableAssets = [],
  ...props
}) => {
  // Calculate metrics from available assets if not provided
  const calculateMetrics = () => {
    if (!availableAssets.length)
      return { totalBorrowed: 0, averageBorrowAPY: 0 };

    let totalBorrowedCalculated = 0;
    let totalWeightedAPY = 0;
    let totalValue = 0;

    availableAssets.forEach((asset) => {
      const borrowedAmount = Number(asset.totalBorrowed || 0);
      const apy = Number(asset.variableBorrowAPY || asset.borrowAPY || 0);
      const price = asset.oraclePrice || asset.priceUSD || 1;
      const value = borrowedAmount * price;

      totalBorrowedCalculated += value;
      totalWeightedAPY += value * apy;
      totalValue += value;
    });

    const avgAPY = totalValue > 0 ? totalWeightedAPY / totalValue : 0;

    return {
      totalBorrowed: totalBorrowedCalculated,
      averageBorrowAPY: avgAPY,
    };
  };

  const metrics = calculateMetrics();
  const displayTotalBorrowed =
    totalBorrowed !== undefined ? totalBorrowed : metrics.totalBorrowed;
  const displayAverageBorrowAPY =
    averageBorrowAPY !== undefined
      ? averageBorrowAPY
      : metrics.averageBorrowAPY;

  const formatBorrowed = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="w-full" {...props}>
        {/* Mobile Layout - Loading */}
        <div className="md:hidden py-3">
          <div className="flex items-center justify-between mb-2 pr-6">
            <div className="w-40 flex-shrink-0 pl-6">
              <span className="text-base font-bold text-white">
                available borrows
              </span>
            </div>
            <div className="w-6 h-6 flex items-center justify-center"></div>
          </div>
          <div className="flex items-center justify-center gap-2 px-6">
            <div className="rounded px-2 py-1 text-xs border h-6 border-zinc-800 text-white/50 animate-pulse">
              loading...
            </div>
          </div>
        </div>

        {/* Desktop Layout - Loading */}
        <div className="hidden md:flex items-center h-[65px]">
          <div className="w-40 flex-shrink-0 pl-6">
            <span className="text-base font-bold text-white">
              available borrows
            </span>
          </div>
          <div className="flex-grow flex justify-center items-center">
            <div className="rounded px-3 py-1 text-xs border h-6 border-zinc-800 text-white/50 animate-pulse">
              loading...
            </div>
          </div>
          <div className="w-12 flex-shrink-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" {...props}>
      {/* Mobile Layout - Two rows */}
      <div className="md:hidden py-3">
        {/* First row: Title and chevron */}
        <div className="flex items-center justify-between mb-2 pr-6">
          <div className="w-40 flex-shrink-0 pl-6">
            <span className="text-base font-bold text-white">
              available borrows
            </span>
          </div>
          {/* Space for chevron */}
          <div className="w-6 h-6 flex items-center justify-center">
            {/* Chevron will be added by parent component */}
          </div>
        </div>

        {/* Second row: Info badges */}
        <div className="flex items-center justify-center gap-2 px-6">
          <div className="rounded px-2 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>total borrowed</span>
            <span className="text-white">
              {formatBorrowed(displayTotalBorrowed)}
            </span>
          </div>

          <div className="rounded px-2 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>avg APY</span>
            <span className="text-red-400">
              {displayAverageBorrowAPY.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Original horizontal layout */}
      <div className="hidden md:flex items-center h-[65px]">
        {/* Title - fixed width with more padding */}
        <div className="w-40 flex-shrink-0 pl-6">
          <span className="text-base font-bold text-white">
            available borrows
          </span>
        </div>

        {/* Info badges - centered in the remaining space */}
        <div className="flex-grow flex justify-center items-center">
          <div className="flex items-center gap-2">
            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
              <span>total borrowed</span>
              <span className="text-white">
                {formatBorrowed(displayTotalBorrowed)}
              </span>
            </div>

            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
              <span>avg APY</span>
              <span className="text-red-400">
                {displayAverageBorrowAPY.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Space for chevron - prevents content from pushing it */}
        <div className="w-12 flex-shrink-0"></div>
      </div>
    </div>
  );
};

export default BorrowAvailablePositionsHeader;
