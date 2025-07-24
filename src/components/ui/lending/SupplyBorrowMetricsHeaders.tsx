import React, { useState, useEffect, useCallback } from "react";
import MetricsCard from "@/components/ui/lending/SupplyBorrowMetricsCard";
import SupplyBorrowToggle from "@/components/ui/lending/SupplyBorrowToggle";
import RiskDetailsModal from "@/components/ui/lending/RiskDetailsModal";
import useWeb3Store, { useSourceChain } from "@/store/web3Store";
import {
  useAaveFetch,
  UserPosition,
  UserBorrowPosition,
  AaveReserveData,
} from "@/utils/aave/fetch";
import { AaveTransactions, UserAccountData } from "@/utils/aave/interact";
import { SupportedChainId } from "@/config/aave";
import { getChainByChainId } from "@/config/chains";
import { altverseAPI } from "@/api/altverse";

interface SupplyBorrowMetricsHeadersProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const SupplyBorrowMetricsHeaders: React.FC<SupplyBorrowMetricsHeadersProps> = ({
  activeTab,
  onTabChange,
}) => {
  const sourceChain = useSourceChain();
  const { getWalletByType } = useWeb3Store();
  const wallet = getWalletByType(sourceChain.walletType);

  // State for AAVE data - following SupplyComponent pattern
  const [userSupplyPositions, setUserSupplyPositions] = useState<
    UserPosition[]
  >([]);
  const [userBorrowPositions, setUserBorrowPositions] = useState<
    UserBorrowPosition[]
  >([]);
  const [userAccountData, setUserAccountData] =
    useState<UserAccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChainId, setLastChainId] = useState<number | null>(null);
  const [marketMetrics, setMarketMetrics] = useState({
    marketSize: "--",
    available: "--",
    borrows: "--",
  });

  const { fetchAllReservesData, fetchUserPositions, fetchUserBorrowPositions } =
    useAaveFetch();

  // Only proceed if we have a connected wallet
  const hasConnectedWallet = !!wallet?.address;

  // Load user positions - following SupplyComponent pattern
  const loadUserPositions = useCallback(
    async (
      supplyAssets: AaveReserveData[],
      borrowAssets: AaveReserveData[],
    ) => {
      if (!hasConnectedWallet || !wallet?.address) return;

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
    [
      hasConnectedWallet,
      wallet?.address,
      fetchUserPositions,
      fetchUserBorrowPositions,
    ],
  );

  // Store all reserves for market calculations
  const [allReserves, setAllReserves] = useState<AaveReserveData[]>([]);

  const loadAaveData = useCallback(
    async (force = false) => {
      if (!hasConnectedWallet || !wallet?.address) return;

      if (loading && !force) return;
      if (
        !force &&
        lastChainId === sourceChain.chainId &&
        userSupplyPositions.length > 0
      )
        return;

      try {
        setLoading(true);

        const reservesResult = await fetchAllReservesData();
        setLastChainId(sourceChain.chainId);

        const allReservesData = [
          ...reservesResult.supplyAssets,
          ...reservesResult.borrowAssets,
        ];
        const uniqueReserves = allReservesData.filter(
          (reserve, index, self) =>
            index === self.findIndex((r) => r.asset === reserve.asset),
        );
        setAllReserves(uniqueReserves);

        await loadUserPositions(
          reservesResult.supplyAssets,
          reservesResult.borrowAssets,
        );

        const accountData = await AaveTransactions.getUserAccountData(
          wallet.address,
          sourceChain.chainId as SupportedChainId,
        );
        setUserAccountData(accountData);
      } catch (err) {
        console.error("Error loading AAVE data:", err);
        setUserSupplyPositions([]);
        setUserBorrowPositions([]);
        setUserAccountData(null);
        setAllReserves([]);
      } finally {
        setLoading(false);
      }
    },
    [
      hasConnectedWallet,
      wallet?.address,
      loading,
      lastChainId,
      sourceChain.chainId,
      userSupplyPositions.length,
      fetchAllReservesData,
      loadUserPositions,
    ],
  );

  // Load data when component mounts or chain changes
  useEffect(() => {
    loadAaveData();
  }, [loadAaveData]);

  // Reset data when chain changes
  useEffect(() => {
    if (lastChainId !== null && lastChainId !== sourceChain.chainId) {
      setUserSupplyPositions([]);
      setUserBorrowPositions([]);
      setUserAccountData(null);
      setAllReserves([]);
    }
  }, [sourceChain.chainId, lastChainId]);

  const calculateNetWorth = () => {
    if (!hasConnectedWallet || loading) return 0;

    const totalSuppliedUSD = userSupplyPositions.reduce((sum, position) => {
      return sum + parseFloat(position.suppliedBalanceUSD || "0");
    }, 0);

    const totalBorrowedUSD = userBorrowPositions.reduce((sum, position) => {
      return sum + parseFloat(position.totalDebtUSD || "0");
    }, 0);

    return totalSuppliedUSD - totalBorrowedUSD;
  };

  const getHealthFactor = () => {
    if (!hasConnectedWallet || loading) return null;

    let totalCollateralWeighted = 0;
    let totalDebtUSD = 0;

    userSupplyPositions.forEach((position) => {
      const suppliedUSD = parseFloat(position.suppliedBalanceUSD || "0");
      const reserveData = allReserves.find(
        (reserve) =>
          reserve.asset.toLowerCase() === position.asset.asset.toLowerCase(),
      );

      let liquidationThreshold = 0.85;
      if (reserveData && reserveData.liquidationThreshold) {
        liquidationThreshold = reserveData.liquidationThreshold;
      } else {
        if (
          position.asset.symbol === "WETH" ||
          position.asset.symbol === "ETH"
        ) {
          liquidationThreshold = 0.825;
        } else if (position.asset.symbol === "WBTC") {
          liquidationThreshold = 0.75;
        }
      }

      totalCollateralWeighted += suppliedUSD * liquidationThreshold;
    });

    userBorrowPositions.forEach((position) => {
      totalDebtUSD += parseFloat(position.totalDebtUSD || "0");
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

    userSupplyPositions.forEach((position) => {
      const suppliedUSD = parseFloat(position.suppliedBalanceUSD || "0");
      const supplyAPY = parseFloat(position.asset.supplyAPY || "0");
      const earnings = suppliedUSD * (supplyAPY / 100);

      totalSupplyEarnings += earnings;
      totalSuppliedUSD += suppliedUSD;
    });

    userBorrowPositions.forEach((position) => {
      const borrowedUSD = parseFloat(position.totalDebtUSD || "0");
      const borrowAPY = parseFloat(position.asset.variableBorrowAPY || "0");
      const cost = borrowedUSD * (borrowAPY / 100);

      totalBorrowCosts += cost;
      totalBorrowedUSD += borrowedUSD;
    });

    const netWorth = totalSuppliedUSD - totalBorrowedUSD;
    if (netWorth === 0) return 0;

    return ((totalSupplyEarnings - totalBorrowCosts) / netWorth) * 100;
  };

  const rawNetWorth = calculateNetWorth();
  const rawNetAPY = calculateWeightedNetAPY();
  const rawHealthFactor = getHealthFactor();

  const userMetrics = {
    netWorth: rawNetWorth,
    netAPY: rawNetAPY,
    healthFactor: rawHealthFactor,
  };

  const calculateMarketMetrics = useCallback(async () => {
    if (!hasConnectedWallet || loading || allReserves.length === 0) {
      return {
        marketSize: "--",
        available: "--",
        borrows: "--",
      };
    }

    let totalSupplyUSD = 0;
    let totalBorrowsUSD = 0;
    const BATCH_SIZE = 5;
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < allReserves.length; i += BATCH_SIZE) {
      const batch = allReserves.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (reserve) => {
        const supplyAmount = parseFloat(reserve.formattedSupply || "0");
        const borrowAmount = parseFloat(reserve.formattedTotalBorrowed || "0");
        let realPrice = 1;

        try {
          const chainInfo = getChainByChainId(sourceChain.chainId);
          if (chainInfo?.alchemyNetworkName) {
            const priceResponse = await altverseAPI.getTokenPrices({
              addresses: [
                {
                  network: chainInfo.alchemyNetworkName,
                  address: reserve.asset,
                },
              ],
            });

            if (
              !priceResponse.error &&
              priceResponse.data?.data?.[0]?.prices?.[0]?.value
            ) {
              realPrice = parseFloat(
                priceResponse.data.data[0].prices[0].value,
              );
            } else {
              throw new Error("No price data");
            }
          } else {
            throw new Error("No network info");
          }
        } catch (error) {
          const userPosition = userSupplyPositions.find(
            (pos) =>
              pos.asset.asset.toLowerCase() === reserve.asset.toLowerCase(),
            console.log(error),
          );
          const userBorrowPosition = userBorrowPositions.find(
            (pos) =>
              pos.asset.asset.toLowerCase() === reserve.asset.toLowerCase(),
          );

          if (
            userPosition &&
            userPosition.suppliedBalanceUSD &&
            userPosition.suppliedBalance
          ) {
            const suppliedUSD = parseFloat(userPosition.suppliedBalanceUSD);
            const suppliedAmount = parseFloat(userPosition.suppliedBalance);
            if (suppliedAmount > 0) {
              realPrice = suppliedUSD / suppliedAmount;
            }
          } else if (
            userBorrowPosition &&
            userBorrowPosition.totalDebtUSD &&
            userBorrowPosition.formattedTotalDebt
          ) {
            const debtUSD = parseFloat(userBorrowPosition.totalDebtUSD);
            const debtAmount = parseFloat(
              userBorrowPosition.formattedTotalDebt,
            );
            if (debtAmount > 0) {
              realPrice = debtUSD / debtAmount;
            }
          } else {
            if (reserve.symbol === "WETH" || reserve.symbol === "ETH")
              realPrice = 3500;
            else if (reserve.symbol === "WBTC" || reserve.symbol === "BTC")
              realPrice = 70000;
            else if (
              reserve.symbol === "USDC" ||
              reserve.symbol === "USDT" ||
              reserve.symbol === "DAI"
            )
              realPrice = 1;
          }
        }

        return {
          supplyValueUSD: supplyAmount * realPrice,
          borrowValueUSD: borrowAmount * realPrice,
        };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result) => {
        totalSupplyUSD += result.supplyValueUSD;
        totalBorrowsUSD += result.borrowValueUSD;
      });

      if (i + BATCH_SIZE < allReserves.length) {
        await delay(200);
      }
    }

    const totalAvailableUSD = totalSupplyUSD - totalBorrowsUSD;

    const formatMarketValue = (value: number) => {
      if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
      if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
      return value.toFixed(2);
    };

    return {
      marketSize: formatMarketValue(totalSupplyUSD),
      available: formatMarketValue(totalAvailableUSD),
      borrows: formatMarketValue(totalBorrowsUSD),
    };
  }, [
    hasConnectedWallet,
    loading,
    allReserves,
    userSupplyPositions,
    userBorrowPositions,
    sourceChain.chainId,
  ]);

  const loadMarketMetrics = useCallback(async () => {
    try {
      const metrics = await calculateMarketMetrics();
      setMarketMetrics(metrics);
    } catch (error) {
      console.error("Error calculating market metrics:", error);
      setMarketMetrics({
        marketSize: "--",
        available: "--",
        borrows: "--",
      });
    }
  }, [calculateMarketMetrics]);

  useEffect(() => {
    if (hasConnectedWallet && allReserves.length > 0 && !loading) {
      loadMarketMetrics();
    }
  }, [loadMarketMetrics, hasConnectedWallet, allReserves.length, loading]);

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
        <RiskDetailsModal userAccountData={userAccountData}>
          <button className="ml-2 rounded bg-[#232326] px-2 py-[2px] text-xs text-[#FFFFFF80] font-['Urbanist'] leading-none whitespace-nowrap hover:bg-[#2a2a2e]">
            risk details
          </button>
        </RiskDetailsModal>
      ) : undefined,
    },
  ];

  const marketMetricsData = [
    {
      label: "Market Size",
      value: marketMetrics.marketSize,
      prefix: "$",
      color: "text-white",
    },
    {
      label: "Available",
      value: marketMetrics.available,
      prefix: "$",
      color: "text-white",
    },
    {
      label: "Borrows",
      value: marketMetrics.borrows,
      prefix: "$",
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
