import React, { useState, useEffect, useCallback } from "react";
import MetricsCard from "@/components/ui/lending/SupplyBorrowMetricsCard";
import SupplyBorrowToggle from "@/components/ui/lending/SupplyBorrowToggle";
import RiskDetailsModal from "@/components/ui/lending/RiskDetailsModal";
import { useAaveChain, useIsWalletTypeConnected } from "@/store/web3Store";
import useWeb3Store from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import {
  useAaveFetch,
  UserPosition,
  UserBorrowPosition,
  AaveReserveData,
} from "@/utils/aave/fetch";
import { getReserveMetrics } from "@/utils/aave/calculations";
import { formatCurrency } from "@/utils/formatters";
import { altverseAPI } from "@/api/altverse";
import { getChainByChainId } from "@/config/chains";

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

  // State for AAVE data - following SupplyComponent pattern
  const [userSupplyPositions, setUserSupplyPositions] = useState<
    UserPosition[]
  >([]);
  const [userBorrowPositions, setUserBorrowPositions] = useState<
    UserBorrowPosition[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [lastChainId, setLastChainId] = useState<number | null>(null);

  const { fetchAllReservesData, fetchUserPositions, fetchUserBorrowPositions } =
    useAaveFetch();

  const fetchOraclePrices = useCallback(
    async (reserves: AaveReserveData[]) => {
      try {
        const chainInfo = getChainByChainId(aaveChain.chainId);
        if (!chainInfo?.alchemyNetworkName) {
          return {};
        }

        const addresses = reserves.map((reserve) => ({
          network: chainInfo.alchemyNetworkName,
          address: reserve.asset,
        }));

        const priceResponse = await altverseAPI.getTokenPrices({ addresses });

        if (priceResponse.error || !priceResponse.data?.data) {
          return {};
        }

        const priceMap: Record<string, number> = {};
        priceResponse.data.data.forEach((tokenData, index) => {
          const reserve = reserves[index];
          const price = tokenData.prices?.[0]?.value
            ? parseFloat(tokenData.prices[0].value)
            : 1;
          priceMap[reserve.asset.toLowerCase()] = price;
        });

        return priceMap;
      } catch {
        return {};
      }
    },
    [aaveChain.chainId],
  );

  // Load user positions - following SupplyComponent pattern
  const loadUserPositions = useCallback(
    async (
      supplyAssets: AaveReserveData[],
      borrowAssets: AaveReserveData[],
    ) => {
      if (!hasConnectedWallet) return;

      try {
        const [supplyPositions, borrowPositions] = await Promise.all([
          fetchUserPositions(supplyAssets),
          fetchUserBorrowPositions(borrowAssets),
        ]);

        setUserSupplyPositions(supplyPositions);
        setUserBorrowPositions(borrowPositions);
      } catch (err) {
        console.error("Error loading user positions:", err);
        setUserSupplyPositions([]);
        setUserBorrowPositions([]);
      }
    },
    [hasConnectedWallet, fetchUserPositions, fetchUserBorrowPositions],
  );

  // Store all reserves for market calculations
  const [allReserves, setAllReserves] = useState<AaveReserveData[]>([]);
  // Store oracle prices for accurate USD calculations
  const [oraclePrices, setOraclePrices] = useState<Record<string, number>>({});

  const loadAaveData = useCallback(
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
        const reservesResult = await fetchAllReservesData(
          aaveChain,
          chainTokens,
        );
        setLastChainId(aaveChain.chainId);

        const allReservesData = [
          ...reservesResult.supplyAssets,
          ...reservesResult.borrowAssets,
        ];
        const uniqueReserves = allReservesData.filter(
          (reserve, index, self) =>
            index === self.findIndex((r) => r.asset === reserve.asset),
        );
        setAllReserves(uniqueReserves);

        const prices = await fetchOraclePrices(uniqueReserves);
        setOraclePrices(prices);
        await loadUserPositions(
          reservesResult.supplyAssets,
          reservesResult.borrowAssets,
        );
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
      fetchAllReservesData,
      loadUserPositions,
      fetchOraclePrices,
      aaveChain,
      chainTokens,
    ],
  );

  // Load data when component mounts or chain changes
  useEffect(() => {
    loadAaveData();
  }, [loadAaveData]);

  // Reset data when chain changes
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
      suppliedBalanceUSD: suppliedBalance * oraclePrice,
    };
  });

  const userBorrowPositionsUSD = userBorrowPositions.map((position) => {
    const formattedTotalDebt = parseFloat(position.formattedTotalDebt || "0");
    const oraclePrice = oraclePrices[position.asset.asset.toLowerCase()] || 1;
    return {
      ...position,
      totalDebtUSD: formattedTotalDebt * oraclePrice,
    };
  });

  const calculateNetWorth = () => {
    if (!hasConnectedWallet || loading) return 0;

    const totalSuppliedUSD = userSupplyPositionsUSD.reduce((sum, position) => {
      return sum + position.suppliedBalanceUSD;
    }, 0);

    const totalBorrowedUSD = userBorrowPositionsUSD.reduce((sum, position) => {
      return sum + position.totalDebtUSD;
    }, 0);

    return totalSuppliedUSD - totalBorrowedUSD;
  };

  const getHealthFactor = () => {
    if (!hasConnectedWallet || loading) return null;

    let totalCollateralWeighted = 0;
    let totalDebtUSD = 0;

    userSupplyPositionsUSD.forEach((position) => {
      const suppliedUSD = position.suppliedBalanceUSD;
      const reserveData = allReserves.find(
        (reserve) =>
          reserve.asset.toLowerCase() === position.asset.asset.toLowerCase(),
      );

      let liquidationThreshold = 0;
      if (reserveData && reserveData.liquidationThreshold) {
        liquidationThreshold =
          typeof reserveData.liquidationThreshold === "string"
            ? parseFloat(reserveData.liquidationThreshold.replace("%", ""))
            : reserveData.liquidationThreshold;
      } else if (position.asset.liquidationThreshold) {
        liquidationThreshold =
          typeof position.asset.liquidationThreshold === "string"
            ? parseFloat(position.asset.liquidationThreshold.replace("%", ""))
            : position.asset.liquidationThreshold;
      } else {
        return;
      }

      if (position.isCollateral) {
        const liquidationThresholdDecimal =
          liquidationThreshold > 1
            ? liquidationThreshold / 100
            : liquidationThreshold;
        totalCollateralWeighted += suppliedUSD * liquidationThresholdDecimal;
      }
    });

    userBorrowPositionsUSD.forEach((position) => {
      totalDebtUSD += position.totalDebtUSD;
    });

    if (totalDebtUSD === 0) return Infinity;
    return totalCollateralWeighted / totalDebtUSD;
  };

  const calculateWeightedNetAPY = () => {
    if (!hasConnectedWallet || loading) return null;

    let totalSupplyEarnings = 0;
    let totalBorrowCosts = 0;
    let totalSuppliedUSD = 0;
    let totalBorrowedUSD = 0;

    userSupplyPositionsUSD.forEach((position) => {
      const suppliedUSD = position.suppliedBalanceUSD;
      const supplyAPY = parseFloat(position.asset.supplyAPY || "0");
      const earnings = suppliedUSD * (supplyAPY / 100);

      totalSupplyEarnings += earnings;
      totalSuppliedUSD += suppliedUSD;
    });

    userBorrowPositionsUSD.forEach((position) => {
      const borrowedUSD = position.totalDebtUSD;
      const borrowAPY = parseFloat(position.asset.variableBorrowAPY || "0");
      const cost = borrowedUSD * (borrowAPY / 100);

      totalBorrowCosts += cost;
      totalBorrowedUSD += borrowedUSD;
    });

    const netWorth = totalSuppliedUSD - totalBorrowedUSD;
    if (netWorth === 0) return 0;

    return ((totalSupplyEarnings - totalBorrowCosts) / netWorth) * 100;
  };

  const calculateLTVData = () => {
    if (!hasConnectedWallet || loading)
      return { currentLTV: 0, maxLTV: 0, liquidationThreshold: 0 };

    const totalBorrowedUSD = userBorrowPositionsUSD.reduce((sum, position) => {
      return sum + position.totalDebtUSD;
    }, 0);

    let weightedMaxLTV = 0;
    let weightedLiquidationThreshold = 0;
    let totalCollateralValue = 0;

    userSupplyPositions.forEach((position) => {
      if (position.isCollateral) {
        const suppliedUSD = parseFloat(position.suppliedBalanceUSD || "0");

        const reserveData = allReserves.find(
          (reserve) =>
            reserve.asset.toLowerCase() === position.asset.asset.toLowerCase(),
        );

        let assetLTV =
          typeof position.asset.ltv === "string"
            ? parseFloat(position.asset.ltv.replace("%", ""))
            : position.asset.ltv || 0;
        let assetLiqThreshold = 0;

        if (reserveData && reserveData.liquidationThreshold) {
          assetLiqThreshold =
            typeof reserveData.liquidationThreshold === "string"
              ? parseFloat(reserveData.liquidationThreshold.replace("%", ""))
              : reserveData.liquidationThreshold;
          if (reserveData.ltv) {
            assetLTV =
              typeof reserveData.ltv === "string"
                ? parseFloat(reserveData.ltv.replace("%", ""))
                : reserveData.ltv;
          }
        } else if (position.asset.liquidationThreshold) {
          assetLiqThreshold =
            typeof position.asset.liquidationThreshold === "string"
              ? parseFloat(position.asset.liquidationThreshold.replace("%", ""))
              : position.asset.liquidationThreshold;
        }

        if (!assetLTV || !assetLiqThreshold) {
          return;
        }

        const assetLTVDecimal = assetLTV > 1 ? assetLTV / 100 : assetLTV;
        const assetLiqThresholdDecimal =
          assetLiqThreshold > 1 ? assetLiqThreshold / 100 : assetLiqThreshold;

        weightedMaxLTV += suppliedUSD * assetLTVDecimal;
        weightedLiquidationThreshold += suppliedUSD * assetLiqThresholdDecimal;
        totalCollateralValue += suppliedUSD;
      }
    });

    const maxLTV =
      totalCollateralValue > 0
        ? (weightedMaxLTV / totalCollateralValue) * 100
        : 0;
    const liquidationThreshold =
      totalCollateralValue > 0
        ? (weightedLiquidationThreshold / totalCollateralValue) * 100
        : 0;
    const currentLTV =
      totalCollateralValue > 0
        ? (totalBorrowedUSD / totalCollateralValue) * 100
        : 0;

    return { currentLTV, maxLTV, liquidationThreshold };
  };

  const rawNetWorth = calculateNetWorth();
  const rawNetAPY = calculateWeightedNetAPY();
  const rawHealthFactor = getHealthFactor();
  const ltvData = calculateLTVData();

  const totalCollateralUSD = userSupplyPositionsUSD.reduce((sum, position) => {
    if (position.isCollateral) {
      return sum + position.suppliedBalanceUSD;
    }
    return sum;
  }, 0);

  const totalBorrowedUSD = userBorrowPositionsUSD.reduce((sum, position) => {
    return sum + position.totalDebtUSD;
  }, 0);

  const userMetrics = {
    netWorth: rawNetWorth,
    netAPY: rawNetAPY,
    healthFactor: rawHealthFactor,
    totalCollateralUSD: totalCollateralUSD, // Use actual collateral USD, not all supplied USD
    totalDebtUSD: totalBorrowedUSD,
    currentLTV: ltvData.currentLTV,
    maxLTV: ltvData.maxLTV,
    liquidationThreshold: ltvData.liquidationThreshold,
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

  const formatNetWorth = (netWorth: number) => {
    if (netWorth === 0) return "--";
    return netWorth.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNetAPY = (netAPY: number | null) => {
    if (netAPY === null) return "--";
    return netAPY.toFixed(2);
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

  const handleButtonClick = (): void => {
    // This will be handled by the RiskDetailsModal trigger
  };

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
