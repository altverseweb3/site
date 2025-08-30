import { useState, useMemo, useCallback, useEffect } from "react";
import { SingleMarketUserSupplies } from "@/components/meta/SingleMarketUserSupplies";
import { ChainId, EvmAddress, AaveMarket } from "@/types/aave";
import { formatCurrency, formatAPY } from "@/utils/formatters";

interface MarketUserReserveSupplyPosition {
  currency: {
    symbol: string;
  };
  balance: {
    usd: string;
  };
  apy: {
    value: string;
  };
  isCollateral: boolean;
}

interface UserSupplyData {
  marketAddress: string;
  marketName: string;
  chainId: ChainId;
  supplies: MarketUserReserveSupplyPosition[];
  loading: boolean;
  error: boolean;
  hasData: boolean;
}

interface AggregatedMarketUserSuppliesProps {
  activeMarkets: AaveMarket[];
  userWalletAddress: EvmAddress;
  children: (props: {
    supplyData: {
      balance: string;
      apy: string;
      collateral: string;
    };
    loading: boolean;
    error: boolean;
    hasData: boolean;
    marketCount: number;
    marketSupplyData: Record<string, UserSupplyData>;
  }) => React.ReactNode;
}

export const AggregatedMarketUserSupplies: React.FC<
  AggregatedMarketUserSuppliesProps
> = ({ activeMarkets, children, userWalletAddress }) => {
  const [marketSupplyDataMap, setMarketSupplyDataMap] = useState<
    Record<string, UserSupplyData>
  >({});

  const currentMarketKeys = useMemo(() => {
    return new Set(
      activeMarkets.map((market) => `${market.chainId}-${market.address}`),
    );
  }, [activeMarkets]);

  useEffect(() => {
    setMarketSupplyDataMap((prev) => {
      const filtered: Record<string, UserSupplyData> = {};

      Object.entries(prev).forEach(([key, data]) => {
        if (currentMarketKeys.has(key)) {
          filtered[key] = data;
        }
      });

      return filtered;
    });
  }, [currentMarketKeys]);

  const handleMarketSupplyDataChange = useCallback(
    (supplyData: UserSupplyData) => {
      const key = `${supplyData.chainId}-${supplyData.marketAddress}`;

      if (currentMarketKeys.has(key)) {
        setMarketSupplyDataMap((prev) => ({
          ...prev,
          [key]: supplyData,
        }));
      }
    },
    [currentMarketKeys],
  );

  const aggregatedData = useMemo(() => {
    const currentMarketSupplyData = Object.entries(marketSupplyDataMap)
      .filter(([key]) => currentMarketKeys.has(key))
      .map(([, data]) => data);

    const isLoading = currentMarketSupplyData.some(
      (marketData) => marketData.loading,
    );

    const hasError = currentMarketSupplyData.some(
      (marketData) => marketData.error,
    );

    const validSupplyStates = currentMarketSupplyData.filter(
      (marketData) =>
        marketData.supplies && !marketData.loading && !marketData.error,
    );

    let supplyData = {
      balance: formatCurrency(0),
      apy: formatAPY(0),
      collateral: formatCurrency(0),
    };

    if (validSupplyStates.length > 0) {
      let totalBalance = 0;
      let totalCollateral = 0;
      let weightedAPYNumerator = 0;
      let totalBalanceForAPY = 0;

      validSupplyStates.forEach((state) => {
        state.supplies.forEach((supply) => {
          const balanceUsd = parseFloat(supply.balance.usd) || 0;
          const apyValue = parseFloat(supply.apy.value) || 0;

          totalBalance += balanceUsd;

          if (supply.isCollateral) {
            totalCollateral += balanceUsd;
          }

          if (balanceUsd > 0) {
            weightedAPYNumerator += balanceUsd * apyValue;
            totalBalanceForAPY += balanceUsd;
          }
        });
      });

      const weightedAPY =
        totalBalanceForAPY > 0 ? weightedAPYNumerator / totalBalanceForAPY : 0;

      supplyData = {
        balance: formatCurrency(totalBalance),
        apy: formatAPY(weightedAPY * 100),
        collateral: formatCurrency(totalCollateral),
      };
    }

    const hasData = validSupplyStates.some((state) => state.hasData);

    const filteredMarketSupplyData = Object.fromEntries(
      Object.entries(marketSupplyDataMap).filter(([key]) =>
        currentMarketKeys.has(key),
      ),
    );

    return {
      supplyData,
      loading: isLoading,
      error: hasError,
      hasData,
      marketCount: activeMarkets.length,
      marketSupplyData: filteredMarketSupplyData,
    };
  }, [marketSupplyDataMap, activeMarkets.length, currentMarketKeys]);

  return (
    <>
      {activeMarkets.map((market) => (
        <SingleMarketUserSupplies
          key={`${market.chainId}-${market.address}`}
          market={market}
          onDataChange={handleMarketSupplyDataChange}
          userWalletAddress={userWalletAddress}
        />
      ))}

      {children(aggregatedData)}
    </>
  );
};
