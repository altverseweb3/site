import React from "react";

interface BorrowedAsset {
  borrowAPY?: number;
  variableBorrowAPY?: number;
  symbol?: string;
  address?: string;
  debtUSD?: number;
}

interface BorrowYourBorrowsHeaderProps {
  totalBorrowed?: number;
  loading?: boolean;
  borrowedAssets?: BorrowedAsset[];
}

const BorrowYourBorrowsHeader: React.FC<BorrowYourBorrowsHeaderProps> = ({
  totalBorrowed = 0,
  loading = false,
  borrowedAssets = [],
  ...props
}) => {
  // Calculate average borrow APY
  const avgBorrowAPY =
    borrowedAssets.length > 0
      ? borrowedAssets.reduce((sum, asset) => sum + (asset.borrowAPY || 0), 0) /
        borrowedAssets.length
      : 0;

  // Calculate borrow power used (this would need actual collateral data)
  const borrowPowerUsed = totalBorrowed > 0 ? "75%" : "0%"; // Placeholder calculation

  const balance = loading ? "Loading..." : `$${totalBorrowed.toFixed(2)}`;
  const apy = loading ? "Loading..." : `${avgBorrowAPY.toFixed(2)}%`;
  const collateral = loading ? "Loading..." : borrowPowerUsed;
  return (
    <div className="w-full" {...props}>
      {/* Mobile Layout - Two rows */}
      <div className="md:hidden py-3">
        {/* First row: Title and chevron */}
        <div className="flex items-center justify-between mb-2 pr-6">
          <div className="w-40 flex-shrink-0 pl-6">
            <span className="text-base font-bold text-white">your borrows</span>
          </div>
          {/* Space for chevron */}
          <div className="w-6 h-6 flex items-center justify-center">
            {/* Chevron will be added by parent component */}
          </div>
        </div>

        {/* Second row: Info badges */}
        <div className="flex items-center justify-center gap-2 px-6">
          <div className="rounded px-2 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>collateral</span>
            <span className="text-white">{collateral}</span>
          </div>

          <div className="rounded px-2 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>balance</span>
            <span className="text-white">{balance}</span>
          </div>

          <div className="rounded px-2 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>APY</span>
            <span className="text-white">{apy}</span>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Original horizontal layout */}
      <div className="hidden md:flex items-center h-[65px]" {...props}>
        {/* Title - fixed width with more padding */}
        <div className="w-40 flex-shrink-0 pl-6">
          <span className="text-base font-bold text-white">your borrows</span>
        </div>

        {/* Info badges - centered in the remaining space */}
        <div className="flex-grow flex justify-center items-center">
          <div className="flex items-center gap-2">
            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
              <span>balance</span>
              <span className="text-white">{balance}</span>
            </div>

            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
              <span>APY</span>
              <span className="text-white">{apy}</span>
            </div>

            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
              <span>borrow power used</span>
              <span className="text-white">{collateral}</span>
            </div>
          </div>
        </div>

        {/* Space for chevron - prevents content from pushing it */}
        <div className="w-12 flex-shrink-0"></div>
      </div>
    </div>
  );
};

export default BorrowYourBorrowsHeader;
