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
    <div
      className="relative z-10 w-full clear-both block overflow-hidden"
      {...props}
    >
      {/* Responsive layout - column on small screens, row on larger screens */}
      <div className="flex flex-col sm:flex-row py-4 px-6 text-white w-full font-['Urbanist']">
        {/* Title - centered on small screens */}
        <div className="w-full text-center sm:text-left mb-4 sm:mb-0 sm:w-auto">
          <span className="text-base font-bold whitespace-nowrap">
            your positions
          </span>
        </div>

        {/* Middle section: info fields - centered horizontally */}
        <div className="w-full sm:flex-grow flex justify-center items-center">
          <div className="flex items-center justify-center flex-wrap gap-2">
            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-[#27272ABF] text-[#FFFFFF80] flex-shrink-0">
              <span>balance</span>
              <span className="text-white">{balance}</span>
            </div>

            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-[#27272ABF] text-[#FFFFFF80] flex-shrink-0">
              <span>APY</span>
              <span className="text-white">{apy}</span>
            </div>

            <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-[#27272ABF] text-[#FFFFFF80] flex-shrink-0">
              <span>collateral</span>
              <span className="text-white">{collateral}</span>
            </div>

            {/* Asset tokens with overlap effect - in a box like other indicators */}
            <div className="rounded px-3 py-1 flex items-center text-xs border h-6 border-[#27272ABF] flex-shrink-0 w-[112px] overflow-hidden">
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
                <span className="text-[10px] text-[#FFFFFF80] whitespace-nowrap ml-1 font-['Urbanist']">
                  +{remainingTokens} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplyYourPositionsHeader;
