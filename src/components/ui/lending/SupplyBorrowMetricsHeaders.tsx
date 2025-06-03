import React, { useMemo } from "react";
import MetricsCard from "@/components/ui/lending/SupplyBorrowMetricsCard";
import SupplyBorrowToggle from "@/components/ui/lending/SupplyBorrowToggle";

// Define flexible but type-safe interfaces
interface FlexibleAccountData {
  totalCollateralBase?: string | number;
  totalDebtBase?: string | number;
  availableBorrowsBase?: string | number;
  currentLiquidationThreshold?: number;
  ltv?: number;
  healthFactor?: string | number;
  [key: string]: unknown; // Allow additional properties
}

interface FlexibleSuppliedAsset {
  currentATokenBalance?: string | number;
  supplyAPY?:
    | string
    | number
    | {
        aaveMethod?: string | number;
        simple?: string | number;
        [key: string]: unknown;
      };
  [key: string]: unknown; // Allow additional properties
}

interface FlexibleBorrowedAsset {
  currentStableDebt?: string | number;
  currentVariableDebt?: string | number;
  borrowAPY?: string | number;
  [key: string]: unknown; // Allow additional properties
}

interface FlexibleMarketMetrics {
  totalMarketSize?: number;
  totalAvailable?: number;
  totalBorrows?: number;
  [key: string]: unknown; // Allow additional properties
}

interface UserMetrics {
  netWorth: string;
  netAPY: string;
  healthFactor: string;
  healthFactorColor: string;
}

interface FormattedMarketMetrics {
  marketSize: string;
  available: string;
  borrows: string;
}

interface MetricItem {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  color: string;
  showButton?: boolean;
  buttonText?: string;
}

interface SupplyBorrowMetricsHeadersProps {
  activeTab: string;
  onTabChange: (button: string) => void;
  aaveData: {
    accountData?: FlexibleAccountData | null;
    marketMetrics?: FlexibleMarketMetrics | null | undefined;
    suppliedAssets?: FlexibleSuppliedAsset[];
    borrowedAssets?: FlexibleBorrowedAsset[];
    loading?: boolean;
    error?: string | null;
  };
}

const SupplyBorrowMetricsHeaders: React.FC<SupplyBorrowMetricsHeadersProps> = ({
  activeTab,
  onTabChange,
  aaveData,
}) => {
  // Calculate user metrics from real Aave data
  const userMetrics = useMemo((): UserMetrics => {
    const accountData = aaveData.accountData || null;
    const suppliedAssets = aaveData.suppliedAssets || [];
    const borrowedAssets = aaveData.borrowedAssets || [];

    // Helper function to get APY value from various possible structures
    const getAPYValue = (asset: FlexibleSuppliedAsset): number => {
      const supplyAPY = asset.supplyAPY;
      if (typeof supplyAPY === "number") return supplyAPY;
      if (typeof supplyAPY === "string") return Number(supplyAPY) || 0;
      if (typeof supplyAPY === "object" && supplyAPY !== null) {
        if ("aaveMethod" in supplyAPY && supplyAPY.aaveMethod) {
          return Number(supplyAPY.aaveMethod) || 0;
        }
        if ("simple" in supplyAPY && supplyAPY.simple) {
          return Number(supplyAPY.simple) || 0;
        }
      }
      return 0;
    };

    if (!accountData) {
      return {
        netWorth: "0.00",
        netAPY: "0.00",
        healthFactor: "0.00",
        healthFactorColor: "text-red-400",
      };
    }

    // Calculate net worth (collateral - debt)
    const netWorth =
      Number(accountData.totalCollateralBase || 0) -
      Number(accountData.totalDebtBase || 0);

    // Calculate weighted average APY
    let totalSupplyValue = 0;
    let weightedSupplyAPY = 0;
    let totalBorrowValue = 0;
    let weightedBorrowAPY = 0;

    // Calculate supply-side weighted APY
    suppliedAssets.forEach((asset: FlexibleSuppliedAsset) => {
      const value = Number(asset.currentATokenBalance || 0);
      const apy = getAPYValue(asset);
      totalSupplyValue += value;
      weightedSupplyAPY += value * apy;
    });

    // Calculate borrow-side weighted APY
    borrowedAssets.forEach((asset: FlexibleBorrowedAsset) => {
      const stableDebt = Number(asset.currentStableDebt || 0);
      const variableDebt = Number(asset.currentVariableDebt || 0);
      const value = stableDebt + variableDebt;
      const apy = Number(asset.borrowAPY || 0);
      totalBorrowValue += value;
      weightedBorrowAPY += value * apy;
    });

    const avgSupplyAPY =
      totalSupplyValue > 0 ? weightedSupplyAPY / totalSupplyValue : 0;
    const avgBorrowAPY =
      totalBorrowValue > 0 ? weightedBorrowAPY / totalBorrowValue : 0;

    // Net APY calculation (supply earnings - borrow costs)
    const netAPY = avgSupplyAPY - avgBorrowAPY;

    // Health factor logic - if net worth is 0, health should be 0
    const hf = netWorth === 0 ? 0 : Number(accountData.healthFactor || 0);
    let healthFactorColor = "text-green-400";
    if (netWorth === 0) healthFactorColor = "text-gray-400";
    else if (hf < 1.1) healthFactorColor = "text-red-400";
    else if (hf < 1.5) healthFactorColor = "text-orange-400";
    else if (hf < 2) healthFactorColor = "text-yellow-400";

    return {
      netWorth: netWorth.toFixed(2),
      netAPY: netAPY.toFixed(2),
      healthFactor: hf === 0 ? "0.00" : hf === Infinity ? "∞" : hf.toFixed(2),
      healthFactorColor,
    };
  }, [aaveData.accountData, aaveData.suppliedAssets, aaveData.borrowedAssets]);

  // Format market metrics for display
  const formattedMarketMetrics = useMemo((): FormattedMarketMetrics => {
    const marketMetrics = aaveData.marketMetrics || null;

    if (!marketMetrics) {
      return {
        marketSize: "0.00B",
        available: "0.00B",
        borrows: "0.00B",
      };
    }

    const formatLargeNumber = (num: number): string => {
      if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
      if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
      if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
      return num.toFixed(2);
    };

    return {
      marketSize: formatLargeNumber(marketMetrics.totalMarketSize || 0),
      available: formatLargeNumber(marketMetrics.totalAvailable || 0),
      borrows: formatLargeNumber(marketMetrics.totalBorrows || 0),
    };
  }, [aaveData.marketMetrics]);

  // Only extract simple values needed for rendering
  const loading = aaveData.loading || false;
  const error = aaveData.error || null;
  const accountData = aaveData.accountData || null;

  // First card metrics (user's position)
  const metricsDataHealth: MetricItem[] = [
    {
      label: "Net Worth",
      value: userMetrics.netWorth,
      prefix: "$",
      color: "text-white",
    },
    {
      label: "Net APY",
      value: userMetrics.netAPY,
      suffix: "%",
      color: "text-amber-500",
    },
    {
      label: "Health Factor",
      value: userMetrics.healthFactor,
      color: userMetrics.healthFactorColor,
      showButton: true,
      buttonText: "risk details",
    },
  ];

  // Second card metrics (market data)
  const marketMetricsData: MetricItem[] = [
    {
      label: "Market Size",
      value: formattedMarketMetrics.marketSize,
      prefix: "$",
      color: "text-white",
    },
    {
      label: "Available",
      value: formattedMarketMetrics.available,
      prefix: "$",
      color: "text-white",
    },
    {
      label: "Borrows",
      value: formattedMarketMetrics.borrows,
      prefix: "$",
      color: "text-white",
    },
  ];

  const handleButtonClick = (): void => {
    console.log(`Button clicked`);
    // Add your logic for showing risk details here
  };

  // Show loading state
  if (loading && !accountData) {
    const loadingMetrics: MetricItem[] = [
      { label: "Net Worth", value: "...", prefix: "$", color: "text-gray-400" },
      { label: "Net APY", value: "...", suffix: "%", color: "text-gray-400" },
      { label: "Health Factor", value: "...", color: "text-gray-400" },
    ];

    const loadingMarketMetrics: MetricItem[] = [
      {
        label: "Market Size",
        value: "...",
        prefix: "$",
        color: "text-gray-400",
      },
      { label: "Available", value: "...", prefix: "$", color: "text-gray-400" },
      { label: "Borrows", value: "...", prefix: "$", color: "text-gray-400" },
    ];

    return (
      <div className="w-full pb-4">
        <div className="flex flex-col gap-4 xl:hidden">
          <div className="w-full">
            <SupplyBorrowToggle
              activeTab={activeTab}
              onTabChange={onTabChange}
              className="w-full"
            />
          </div>
          <div className="w-full">
            <MetricsCard
              metrics={loadingMetrics}
              className="w-full opacity-60"
            />
          </div>
          <div className="w-full">
            <MetricsCard
              metrics={loadingMarketMetrics}
              className="w-full opacity-60"
            />
          </div>
        </div>
        <div className="hidden xl:block">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex-shrink-0 w-full xl:w-auto">
              <SupplyBorrowToggle
                activeTab={activeTab}
                onTabChange={onTabChange}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-4 w-full xl:w-auto">
              <div className="w-full xl:w-auto">
                <MetricsCard
                  metrics={loadingMetrics}
                  className="w-full xl:w-auto opacity-60"
                />
              </div>
              <div className="w-full xl:w-auto">
                <MetricsCard
                  metrics={loadingMarketMetrics}
                  className="w-full xl:w-auto opacity-60"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-4">
      {/* Error indicator */}
      {error && (
        <div className="mb-2 text-xs text-red-400 text-center">
          ⚠️ Using cached data - refresh failed
        </div>
      )}

      {/* Mobile and tablet views */}
      <div className="flex flex-col gap-4 xl:hidden">
        {/* Supply/Borrow Toggle */}
        <div className="w-full">
          <SupplyBorrowToggle
            activeTab={activeTab}
            onTabChange={onTabChange}
            className="w-full"
          />
        </div>

        {/* Metrics cards stacked vertically with full width */}
        <div className="w-full">
          <MetricsCard
            metrics={metricsDataHealth}
            onButtonClick={handleButtonClick}
            className="w-full"
          />
        </div>
        <div className="w-full">
          <MetricsCard metrics={marketMetricsData} className="w-full" />
        </div>
      </div>

      {/* Desktop view with responsive layout - only show on xl screens */}
      <div className="hidden xl:block">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex-shrink-0 w-full xl:w-auto">
            <SupplyBorrowToggle
              activeTab={activeTab}
              onTabChange={onTabChange}
            />
          </div>

          {/* Metrics cards with responsive layout */}
          <div className="flex flex-wrap justify-end gap-4 w-full xl:w-auto">
            <div className="w-full xl:w-auto">
              <MetricsCard
                metrics={metricsDataHealth}
                onButtonClick={handleButtonClick}
                className="w-full xl:w-auto"
              />
            </div>
            <div className="w-full xl:w-auto">
              <MetricsCard
                metrics={marketMetricsData}
                className="w-full xl:w-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplyBorrowMetricsHeaders;
