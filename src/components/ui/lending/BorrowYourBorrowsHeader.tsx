import React from "react";

const BorrowYourBorrowsHeader = ({
  balance = "$0.41",
  apy = "3.29%",
  collateral = "$0.41",
  ...props
}) => {
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
