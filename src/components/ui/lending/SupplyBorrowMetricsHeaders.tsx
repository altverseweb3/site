import React, { useState, useEffect, useCallback } from "react";
import MetricsCard from "@/components/ui/lending/SupplyBorrowMetricsCard";
import SupplyBorrowToggle from "@/components/ui/lending/SupplyBorrowToggle";
import RiskDetailsModal from "@/components/ui/lending/RiskDetailsModal";
import { useAaveChain, useIsWalletTypeConnected } from "@/store/web3Store";
import useWeb3Store from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import { getReserveMetrics } from "@/utils/aave/fetch";

import {
  formatCurrency,
  formatNetAPY,
  formatNetWorth,
} from "@/utils/formatters";
import { useAaveDataLoader } from "@/utils/aave/dataLoader";
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
}

const SupplyBorrowMetricsHeaders: React.FC<SupplyBorrowMetricsHeadersProps> = ({
  activeTab,
  onTabChange,
  chainPicker,
}) => {
  const aaveChain = useAaveChain();
  const getTokensForChain = useWeb3Store((state) => state.getTokensForChain);
  const chainTokens = getTokensForChain(aaveChain.chainId);
  const hasConnectedWallet = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  const [userSupplyPositions, setUserSupplyPositions] = useState<
    UserPosition[]
  >([]);
  const [userBorrowPositions, setUserBorrowPositions] = useState<
    UserBorrowPosition[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [lastChainId, setLastChainId] = useState<number | null>(null);

  const { loadAaveData } = useAaveDataLoader();

  const [allReserves, setAllReserves] = useState<AaveReserveData[]>([]);
  const [oraclePrices, setOraclePrices] = useState<Record<string, number>>({});

  const loadAaveDataCallback = useCallback(
    async (force = false) => {
      if (loading && !force) {
        return;
      }

      if (
        !force &&
        lastChainId === aaveChain.chainId &&
        allReserves.length > 0
      ) {
        return;
      }

      try {
        setLoading(true);
        const result = await loadAaveData({
          aaveChain,
          chainTokens,
          hasConnectedWallet,
          force,
          loading,
          lastChainId,
          allReservesLength: allReserves.length,
        });

        if (result) {
          setLastChainId(aaveChain.chainId);
          setAllReserves(result.allReserves);
          setOraclePrices(result.oraclePrices);
          setUserSupplyPositions(result.userSupplyPositions);
          setUserBorrowPositions(result.userBorrowPositions);
        }
      } catch (err) {
        console.error("Error loading Aave data:", err);
        setUserSupplyPositions([]);
        setUserBorrowPositions([]);
        setAllReserves([]);
        setOraclePrices({});
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      lastChainId,
      allReserves.length,
      loadAaveData,
      aaveChain,
      chainTokens,
      hasConnectedWallet,
    ],
  );

  useEffect(() => {
    loadAaveDataCallback();
  }, [loadAaveDataCallback]);

  useEffect(() => {
    if (lastChainId !== null && lastChainId !== aaveChain.chainId) {
      setUserSupplyPositions([]);
      setUserBorrowPositions([]);
      setAllReserves([]);
      setOraclePrices({});
    }
  }, [aaveChain.chainId, lastChainId]);

  const userSupplyPositionsUSD = userSupplyPositions.map((position) => {
    const suppliedBalance = parseFloat(position.suppliedBalance || "0");
    const oraclePrice = oraclePrices[position.asset.asset.toLowerCase()] || 1;
    return {
      ...position,
      suppliedBalanceUSD: (suppliedBalance * oraclePrice).toFixed(2),
    };
  });

  const userBorrowPositionsUSD = userBorrowPositions.map((position) => {
    const formattedTotalDebt = parseFloat(position.formattedTotalDebt || "0");
    const oraclePrice = oraclePrices[position.asset.asset.toLowerCase()] || 1;
    return {
      ...position,
      totalDebtUSD: (formattedTotalDebt * oraclePrice).toFixed(2),
    };
  });

  const userMetrics =
    hasConnectedWallet && !loading
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
    if (loading || !hasConnectedWallet || allReserves.length === 0) {
      return {
        marketSize: "--",
        available: "--",
        borrows: "--",
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
        const metrics = getReserveMetrics(reserve, null);
        const tokenPrice = oraclePrices[reserve.asset.toLowerCase()] || 1;

        totalMarketSizeUSD += parseFloat(metrics.reserveSize) * tokenPrice;
        totalAvailableUSD +=
          parseFloat(metrics.availableLiquidity) * tokenPrice;
        totalBorrowsUSD += parseFloat(metrics.totalBorrowed) * tokenPrice;
      });

      return {
        marketSize: formatCurrency(totalMarketSizeUSD),
        available: formatCurrency(totalAvailableUSD),
        borrows: formatCurrency(totalBorrowsUSD),
      };
    } catch {
      return {
        marketSize: "--",
        available: "--",
        borrows: "--",
      };
    }
  };

  const getHealthFactorColor = (healthFactor: number | null) => {
    if (healthFactor === null) return "text-white";
    if (healthFactor === Infinity) return "text-green-500";
    if (healthFactor >= 2) return "text-green-500";
    if (healthFactor >= 1.5) return "text-amber-500";
    if (healthFactor >= 1.1) return "text-orange-500";
    return "text-red-500";
  };

  const formatHealthFactor = (healthFactor: number | null) => {
    if (healthFactor === null) return "--";
    if (healthFactor === Infinity) return "∞";
    return healthFactor.toFixed(2);
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
