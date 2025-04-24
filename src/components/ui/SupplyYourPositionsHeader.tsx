import React from "react";

const SupplyYourPositionsHeader = ({
  balance = "$0.41",
  apy = "3.29%",
  collateral = "$0.41",
  assets = [
    { id: 1, letter: "C", color: "bg-cyan-500" },
    { id: 2, letter: "T", color: "bg-indigo-500" },
    { id: 3, letter: "C", color: "bg-blue-500" },
    { id: 4, letter: "E", color: "bg-purple-500" },
    { id: 5, letter: "A", color: "bg-green-500" },
  ],
  ...props
}) => {
  // Define how many tokens to show before using "+X more"
  const visibleTokens = 3;
  const remainingTokens =
    assets.length > visibleTokens ? assets.length - visibleTokens : 0;

  return (
    <div className="w-full flex items-center h-[65px]" {...props}>
      {/* Title - fixed width with more padding */}
      <div className="w-40 flex-shrink-0 pl-6">
        <span className="text-base font-bold text-white">your positions</span>
      </div>

      {/* Info badges - centered in the remaining space */}
      <div className="flex-grow flex justify-center items-center">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>balance</span>
            <span className="text-white">{balance}</span>
          </div>

          <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>APY</span>
            <span className="text-white">{apy}</span>
          </div>

          <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-zinc-800 text-white/50">
            <span>collateral</span>
            <span className="text-white">{collateral}</span>
          </div>

          {/* Asset tokens */}
          <div className="rounded px-3 py-1 flex items-center text-xs border h-6 border-zinc-800 w-[112px] overflow-hidden">
            <div className="flex -space-x-2 items-center">
              {assets.slice(0, visibleTokens).map((asset) => (
                <div
                  key={asset.id}
                  className={`w-4 h-4 rounded-full ${asset.color} flex items-center justify-center text-[10px] font-bold ring-1 ring-black`}
                >
                  {asset.letter}
                </div>
              ))}
            </div>
            {remainingTokens > 0 && (
              <span className="text-[10px] text-white/50 whitespace-nowrap ml-1">
                +{remainingTokens} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Space for chevron - prevents content from pushing it */}
      <div className="w-12 flex-shrink-0"></div>
    </div>
  );
};

export default SupplyYourPositionsHeader;
