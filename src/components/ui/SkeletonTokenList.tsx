// SkeletonTokenList.tsx
import React from "react";

interface SkeletonTokenListProps {
  itemCount?: number;
}

// Updated Skeleton Token Item
const SkeletonTokenItem: React.FC = () => {
  return (
    // Outer padding matches TokenListItem
    <div className="px-2 py-0.5">
      {/* Inner container with padding, flex, justify-between, and pulse animation */}
      <div className="flex items-center justify-between p-[5px] px-[9px] rounded-md w-full bg-[#27272A]/20 animate-pulse">
        {/* Left Section: Icon + Text */}
        <div className="flex items-center gap-3">
          {/* Token icon skeleton: Assuming 32x32 (w-8 h-8) */}
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-zinc-700"></div>

          {/* Text details column */}
          <div className="flex flex-col">
            {/* Token name skeleton (maps to font-medium -> h-4) */}
            <div className="h-4 w-24 bg-zinc-700 rounded mb-1.5"></div>{" "}
            {/* Added margin-bottom */}
            {/* Lower details row (ticker + address) */}
            <div className="flex items-center">
              {/* Token ticker skeleton (maps to text-[0.75rem] -> h-3, MATCHES w-16) */}
              <div className="h-3 w-16 bg-zinc-700 rounded mr-2"></div>{" "}
              {/* Added margin-right */}
              {/* Token address skeleton (maps to text-[10px] -> h-3) */}
              <div className="h-3 w-20 bg-zinc-700 rounded"></div>
            </div>
          </div>
        </div>

        {/* Right Section: Balances */}
        <div className="flex flex-col items-end">
          {" "}
          {/* Use flex-col and items-end for alignment */}
          {/* Token value skeleton (maps to font-medium -> h-4) */}
          <div className="h-4 w-12 bg-zinc-700 rounded mb-1.5"></div>{" "}
          {/* Added margin-bottom */}
          {/* Token balance skeleton (maps to text-sm -> h-3) */}
          <div className="h-3 w-8 bg-zinc-700 rounded"></div>
        </div>
      </div>
    </div>
  );
};

// SkeletonTokenList remains largely the same, just uses the updated item
export const SkeletonTokenList: React.FC<SkeletonTokenListProps> = ({
  itemCount = 8,
}) => {
  // Determine how many items to show in each section based on total itemCount
  const walletItemCount = Math.min(3, Math.max(0, itemCount));
  const allItemCount = Math.max(0, itemCount - walletItemCount);

  return (
    <div className="space-y-0">
      {" "}
      {/* Adjusted space-y if needed, often padding handles it */}
      {/* Wallet section skeleton */}
      {walletItemCount > 0 && (
        <div>
          <div className="px-4 pb-2 pt-0 text-sm text-[#FAFAFA55]">
            your wallet
          </div>
          <div>
            {Array(walletItemCount)
              .fill(0)
              .map((_, index) => (
                <SkeletonTokenItem key={`wallet-${index}`} />
              ))}
          </div>
        </div>
      )}
      {/* All tokens section skeleton */}
      {allItemCount > 0 && (
        <div>
          <div
            className={`px-4 pb-2 text-sm text-[#FAFAFA55] ${walletItemCount > 0 ? "pt-4" : "pt-0"}`}
          >
            all tokens
          </div>
          <div>
            {Array(allItemCount)
              .fill(0)
              .map((_, index) => (
                <SkeletonTokenItem key={`all-${index}`} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkeletonTokenList;
