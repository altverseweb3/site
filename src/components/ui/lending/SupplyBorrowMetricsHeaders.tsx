import React from "react";
import MetricsCard from "@/components/ui/lending/SupplyBorrowMetricsCard";
import SupplyBorrowToggle from "@/components/ui/lending/SupplyBorrowToggle";
import RiskDetailsModal from "@/components/ui/lending/RiskDetailsModal";
import { useIsWalletTypeConnected } from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import { getReserveMetrics } from "@/utils/aave/fetch";

import {
  formatCurrency,
  formatNetAPY,
  formatNetWorth,
  formatHealthFactor,
} from "@/utils/formatters";
import {
  getHealthFactorColor,
  calculateUserSupplyPositionsUSD,
  calculateUserBorrowPositionsUSD,
} from "@/utils/aave/utils";
import {
  AaveReserveData,
  UserBorrowPosition,
  UserPosition,
} from "@/types/aave";
import { calculateUserMetrics } from "@/utils/aave/metricsCalculations";

interface SupplyBorrowMetricsHeadersProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  chainPicker?: React.ReactNode;
  userSupplyPositions?: UserPosition[];
  userBorrowPositions?: UserBorrowPosition[];
  allReserves?: AaveReserveData[];
  oraclePrices?: Record<string, number>;
  isLoading?: boolean;
}

const SupplyBorrowMetricsHeaders: React.FC<SupplyBorrowMetricsHeadersProps> = ({
  activeTab,
  onTabChange,
  chainPicker,
  userSupplyPositions = [],
  userBorrowPositions = [],
  allReserves = [],
  oraclePrices = {},
  isLoading = false,
}) => {
  const hasConnectedWallet = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  const userSupplyPositionsUSD = calculateUserSupplyPositionsUSD(
    userSupplyPositions,
    oraclePrices,
  );

  const userBorrowPositionsUSD = calculateUserBorrowPositionsUSD(
    userBorrowPositions,
    oraclePrices,
  );

  const userMetrics =
    hasConnectedWallet && !isLoading
      ? calculateUserMetrics(userSupplyPositionsUSD, userBorrowPositionsUSD)
      : {
          netWorth: 0,
          netAPY: null,
          healthFactor: null,
          totalCollateralUSD: 0,
          totalDebtUSD: 0,
          currentLTV: 0,
          maxLTV: 0,
          liquidationThreshold: 0,
        };

  const getMarketMetrics = () => {
    if (isLoading || !hasConnectedWallet || allReserves.length === 0) {
      return {
        marketSize: null,
        available: null,
        borrows: null,
      };
    }

    try {
      let totalMarketSizeUSD = 0;
      let totalAvailableUSD = 0;
      let totalBorrowsUSD = 0;

      const activeReserves = allReserves.filter(
        (reserve) => reserve.isActive && !reserve.isFrozen,
      );

      activeReserves.forEach((reserve) => {
        const metrics = getReserveMetrics(reserve);
        const tokenPrice = oraclePrices[reserve.asset.address.toLowerCase()];

        if (tokenPrice !== undefined) {
          totalMarketSizeUSD += parseFloat(metrics.reserveSize) * tokenPrice;
          totalAvailableUSD +=
            parseFloat(metrics.availableLiquidity) * tokenPrice;
          totalBorrowsUSD += parseFloat(metrics.totalBorrowed) * tokenPrice;
        }
      });

      return {
        marketSize: formatCurrency(totalMarketSizeUSD),
        available: formatCurrency(totalAvailableUSD),
        borrows: formatCurrency(totalBorrowsUSD),
      };
    } catch {
      return {
        marketSize: null,
        available: null,
        borrows: null,
      };
    }
  };

  const metricsDataHealth = [
    {
      label: "Net Worth",
      value: formatNetWorth(userMetrics.netWorth),
      prefix: "$",
      color: "text-white",
    },
    {
      label: "Net APY",
      value: formatNetAPY(userMetrics.netAPY),
      suffix: "%",
      color:
        hasConnectedWallet &&
        userMetrics.netAPY !== null &&
        userMetrics.netAPY >= 0
          ? "text-green-500"
          : "text-white",
    },
    {
      label: "Health Factor",
      value: formatHealthFactor(userMetrics.healthFactor),
      color: getHealthFactorColor(userMetrics.healthFactor),
      showButton: hasConnectedWallet,
      buttonText: "risk details",
      customButton: hasConnectedWallet ? (
        <RiskDetailsModal
          healthFactor={userMetrics.healthFactor}
          totalCollateralUSD={userMetrics.totalCollateralUSD}
          totalDebtUSD={userMetrics.totalDebtUSD}
          currentLTV={userMetrics.currentLTV}
          maxLTV={userMetrics.maxLTV}
          liquidationThreshold={userMetrics.liquidationThreshold}
        >
          <button className="ml-2 rounded bg-[#232326] px-2 py-[2px] text-xs text-[#FFFFFF80] font-['Urbanist'] leading-none whitespace-nowrap hover:bg-[#2a2a2e]">
            risk details
          </button>
        </RiskDetailsModal>
      ) : undefined,
    },
  ];

  const currentMarketMetrics = getMarketMetrics();
  const marketMetricsData = [
    {
      label: "Market Size",
      value: currentMarketMetrics.marketSize,
      color: "text-white",
    },
    {
      label: "Available",
      value: currentMarketMetrics.available,
      color: "text-white",
    },
    {
      label: "Borrows",
      value: currentMarketMetrics.borrows,
      color: "text-white",
    },
  ];

  const handleButtonClick = (): void => {};

  return (
    <div className="w-full pb-4">
      {/* Mobile and tablet views */}
      <div className="flex flex-col gap-4 xl:hidden">
        {/* Supply/Borrow Toggle and Chain Picker */}
        <div className="flex flex-col gap-2 w-full">
          <SupplyBorrowToggle
            activeTab={activeTab}
            onTabChange={onTabChange}
            className="w-full"
          />
          {chainPicker && <div className="w-full">{chainPicker}</div>}
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
          <div className="flex gap-4 items-end flex-shrink-0 w-full xl:w-auto">
            <SupplyBorrowToggle
              activeTab={activeTab}
              onTabChange={onTabChange}
            />
            {chainPicker && <div>{chainPicker}</div>}
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
