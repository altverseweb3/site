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
  return (
    <div
      className="relative z-10 w-full clear-both block overflow-hidden"
      {...props}
    >
      <div className="flex items-center justify-between py-4 px-6 text-white w-full font-['Urbanist']">
        <div className="flex-shrink-0">
          <span className="text-base font-bold whitespace-nowrap">
            your positions
          </span>
        </div>

        <div className="flex items-center justify-end space-x-4 flex-shrink min-w-0">
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

          <div className="rounded px-3 py-1 flex items-center gap-1 text-xs border h-6 border-[#27272ABF] text-[#FFFFFF80] flex-shrink-0">
            <span className="text-white">
              {assets.length} {assets.length === 1 ? "asset" : "assets"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add this to your tailwind.config.js to include Urbanist font
// module.exports = {
//   theme: {
//     extend: {
//       fontFamily: {
//         'urbanist': ['Urbanist', 'sans-serif'],
//       },
//     },
//   },
//   plugins: [],
// }

export default SupplyYourPositionsHeader;
