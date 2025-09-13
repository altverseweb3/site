import { useState, useMemo, useCallback, useEffect } from "react";
import { SingleMarketUserBorrows } from "@/components/meta/SingleMarketUserBorrows";
import { EvmAddress, Market, UserBorrowData } from "@/types/aave";
import { formatCurrency, formatPercentage } from "@/utils/formatters";

interface AggregatedMarketUserBorrowsProps {
  activeMarkets: Market[];
  userWalletAddress: EvmAddress;
  children: (props: {
    borrowData: {
      balance: string;
      apy: string;
    };
    loading: boolean;
    error: boolean;
    hasData: boolean;
    marketCount: number;
    marketBorrowData: Record<string, UserBorrowData>;
  }) => React.ReactNode;
}

export const AggregatedMarketUserBorrows: React.FC<
  AggregatedMarketUserBorrowsProps
> = ({ activeMarkets, children, userWalletAddress }) => {
  const [marketBorrowDataMap, setMarketBorrowDataMap] = useState<
    Record<string, UserBorrowData>
  >({});

  const currentMarketKeys = useMemo(() => {
    return new Set(
      activeMarkets.map(
        (market) => `${market.chain.chainId}-${market.address}`,
      ),
    );
  }, [activeMarkets]);

  useEffect(() => {
    setMarketBorrowDataMap((prev) => {
      const filtered: Record<string, UserBorrowData> = {};

      Object.entries(prev).forEach(([key, data]) => {
        if (currentMarketKeys.has(key)) {
          filtered[key] = data;
        }
      });

      return filtered;
    });
  }, [currentMarketKeys]);

  const handleMarketBorrowDataChange = useCallback(
    (borrowData: UserBorrowData) => {
      const key = `${borrowData.chainId}-${borrowData.marketAddress}`;

      if (currentMarketKeys.has(key)) {
        setMarketBorrowDataMap((prev) => ({
          ...prev,
          [key]: borrowData,
        }));
      }
    },
    [currentMarketKeys],
  );

  const aggregatedData = useMemo(() => {
    const currentMarketBorrowData = Object.entries(marketBorrowDataMap)
      .filter(([key]) => currentMarketKeys.has(key))
      .map(([, data]) => data);

    const isLoading = currentMarketBorrowData.some(
      (marketData) => marketData.loading,
    );

    const hasError = currentMarketBorrowData.some(
      (marketData) => marketData.error,
    );

    const validBorrowStates = currentMarketBorrowData.filter(
      (marketData) =>
        marketData.borrows && !marketData.loading && !marketData.error,
    );

    let borrowData = {
      balance: formatCurrency(0),
      apy: formatPercentage(0),
    };

    if (validBorrowStates.length > 0) {
      let totalBalance = 0;
      let weightedAPYNumerator = 0;
      let totalBalanceForAPY = 0;

      validBorrowStates.forEach((state) => {
        state.borrows.forEach((borrow) => {
          const balanceUsd = parseFloat(borrow.debt.usd) || 0;
          const apyValue = parseFloat(borrow.apy.value) || 0;

          totalBalance += balanceUsd;

          if (balanceUsd > 0) {
            weightedAPYNumerator += balanceUsd * apyValue;
            totalBalanceForAPY += balanceUsd;
          }
        });
      });

      const weightedAPY =
        totalBalanceForAPY > 0 ? weightedAPYNumerator / totalBalanceForAPY : 0;

      borrowData = {
        balance: formatCurrency(totalBalance),
        apy: formatPercentage(weightedAPY * 100),
      };
    }

    const hasData = validBorrowStates.some((state) => state.hasData);

    const filteredMarketBorrowData = Object.fromEntries(
      Object.entries(marketBorrowDataMap).filter(([key]) =>
        currentMarketKeys.has(key),
      ),
    );

    return {
      borrowData,
      loading: isLoading,
      error: hasError,
      hasData,
      marketCount: activeMarkets.length,
      marketBorrowData: filteredMarketBorrowData,
    };
  }, [marketBorrowDataMap, activeMarkets.length, currentMarketKeys]);

  return (
    <>
      {activeMarkets.map((market) => (
        <SingleMarketUserBorrows
          key={`${market.chain.chainId}-${market.address}`}
          market={market}
          onDataChange={handleMarketBorrowDataChange}
          userWalletAddress={userWalletAddress}
        />
      ))}

      {children(aggregatedData)}
    </>
  );
};
