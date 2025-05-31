import React from "react";

interface Asset {
  id: string;
  letter: string;
  color: string;
  symbol: string;
}

interface SupplyYourPositionsHeaderProps {
  totalSupplied?: number;
  loading?: boolean;
  suppliedAssets?: Array<{
    address: string;
    symbol: string;
    currentATokenBalance: string | number;
    supplyAPY?: {
      aaveMethod?: string | number;
    };
    usageAsCollateralEnabled: boolean;
  }>;
}

const SupplyYourPositionsHeader: React.FC<SupplyYourPositionsHeaderProps> = ({
  totalSupplied = 0,
  loading = false,
  suppliedAssets = [],
  ...props
}) => {
  // Calculate actual metrics from supplied assets
  const balance = `$${totalSupplied.toFixed(2)}`;

  // Calculate weighted average APY
  const calculateWeightedAPY = () => {
    if (!suppliedAssets.length || totalSupplied === 0) return "0.00";

    let totalValue = 0;
    let weightedAPY = 0;

    suppliedAssets.forEach((asset) => {
      const value = Number(asset.currentATokenBalance || 0);
      const apy = Number(asset.supplyAPY?.aaveMethod || 0);
      totalValue += value;
      weightedAPY += value * apy;
    });

    return totalValue > 0 ? (weightedAPY / totalValue).toFixed(2) : "0.00";
  };

  const apy = `${calculateWeightedAPY()}%`;

  // Calculate collateral value (only assets used as collateral)
  const calculateCollateralValue = () => {
    if (!suppliedAssets.length) return 0;

    return suppliedAssets.reduce((sum, asset) => {
      if (asset.usageAsCollateralEnabled) {
        return sum + Number(asset.currentATokenBalance || 0);
      }
      return sum;
    }, 0);
  };

  const collateral = `$${calculateCollateralValue().toFixed(2)}`;

  // Generate asset tokens from real supplied assets
  const generateAssetTokens = (): Asset[] => {
    if (!suppliedAssets.length) return [];

    const colors = [
      "bg-cyan-500",
      "bg-indigo-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
    ];

    return suppliedAssets.map((asset, index) => ({
      id: asset.address || `asset-${index}`,
      letter: asset.symbol ? asset.symbol.charAt(0).toUpperCase() : "?",
      color: colors[index % colors.length],
      symbol: asset.symbol || "",
    }));
  };

  const assets = generateAssetTokens();

  // Define how many tokens to show before using "+X more"
  const visibleTokens = 3;
  const remainingTokens =
    assets.length > visibleTokens ? assets.length - visibleTokens : 0;

  // Show loading state
  if (loading) {
    return (
      <div className="w-full" {...props}>
        {/* Mobile Layout - Loading */}
        <div className="md:hidden py-3">
          <div className="flex items-center justify-between mb-2 pr-6">
            <div className="w-40 flex-shrink-0 pl-6">
              <span className="text-base font-bold text-white">
                your positions
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
              your positions
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
              your positions
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
      <div className="hidden md:flex items-center h-[65px]">
        {/* Title - fixed width with more padding */}
        <div className="w-40 flex-shrink-0 pl-6">
          <span className="text-base font-bold text-white">your positions</span>
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
              <span>collateral</span>
              <span className="text-white">{collateral}</span>
            </div>

            {/* Asset tokens */}
            <div className="rounded px-3 py-1 flex items-center text-xs border h-6 border-zinc-800 w-[112px] overflow-hidden">
              {assets.length > 0 ? (
                <>
                  <div className="flex -space-x-2 items-center">
                    {assets.slice(0, visibleTokens).map((asset) => (
                      <div
                        key={asset.id}
                        className={`w-4 h-4 rounded-full ${asset.color} flex items-center justify-center text-[10px] font-bold ring-1 ring-black`}
                        title={asset.symbol}
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
                </>
              ) : (
                <span className="text-[10px] text-white/50">no assets</span>
              )}
            </div>
          </div>
        </div>

        {/* Space for chevron - prevents content from pushing it */}
        <div className="w-12 flex-shrink-0"></div>
      </div>
    </div>
  );
};

export default SupplyYourPositionsHeader;
