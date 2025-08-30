import { useState, useMemo, useCallback, useEffect } from "react";
import { SingleMarketUserSupplies } from "@/components/meta/SingleMarketUserSupplies";
import { ChainId, EvmAddress, AaveMarket } from "@/types/aave";
import { formatCurrency, formatAPY } from "@/utils/formatters";

interface MarketUserReserveSupplyPosition {
  __typename: "MarketUserReserveSupplyPosition";
  market: {
    __typename: "MarketInfo";
    name: string;
    address: string;
    chain: {
      __typename: "Chain";
      name: string;
      chainId: number;
    };
  };
  currency: {
    __typename: "Currency";
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    chainId: number;
  };
  balance: {
    __typename: "TokenAmount";
    usd: string;
    amount: {
      __typename: "DecimalValue";
      value: string;
    };
  };
  apy: {
    __typename: "PercentValue";
    value: string;
    formatted: string;
  };
  isCollateral: boolean;
  canBeCollateral: boolean;
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
    console.log(`[AggregatedMarketUserSupplies] Recalculating aggregated data`);
    console.log(
      `[AggregatedMarketUserSupplies] Current market keys:`,
      Array.from(currentMarketKeys),
    );
    console.log(
      `[AggregatedMarketUserSupplies] Market supply data map:`,
      marketSupplyDataMap,
    );

    const currentMarketSupplyData = Object.entries(marketSupplyDataMap)
      .filter(([key]) => currentMarketKeys.has(key))
      .map(([, data]) => data);

    console.log(
      `[AggregatedMarketUserSupplies] Current market supply data:`,
      currentMarketSupplyData,
    );

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

    console.log(
      `[AggregatedMarketUserSupplies] Valid supply states:`,
      validSupplyStates,
    );
    console.log(
      `[AggregatedMarketUserSupplies] Loading: ${isLoading}, Error: ${hasError}`,
    );

    let supplyData = {
      balance: formatCurrency(0),
      apy: formatAPY(0),
      collateral: formatCurrency(0),
    };

    if (validSupplyStates.length > 0) {
      console.log(
        `[AggregatedMarketUserSupplies] Processing ${validSupplyStates.length} valid supply states`,
      );
      let totalBalance = 0;
      let totalCollateral = 0;
      let weightedAPYNumerator = 0;
      let totalBalanceForAPY = 0;

      validSupplyStates.forEach((state, stateIndex) => {
        console.log(
          `[AggregatedMarketUserSupplies] Processing state ${stateIndex} for market ${state.marketName}:`,
          state.supplies,
        );
        state.supplies.forEach((supply, supplyIndex) => {
          const balanceUsd = parseFloat(supply.balance.usd) || 0;
          const apyValue = parseFloat(supply.apy.value) || 0;

          console.log(
            `[AggregatedMarketUserSupplies] Supply ${supplyIndex} - ${supply.currency.symbol}: balance=${balanceUsd}, apy=${apyValue}, isCollateral=${supply.isCollateral}`,
          );

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

      console.log(`[AggregatedMarketUserSupplies] Final calculations:`);
      console.log(`  - Total Balance: ${totalBalance}`);
      console.log(`  - Total Collateral: ${totalCollateral}`);
      console.log(`  - Weighted APY: ${weightedAPY}`);
      console.log(`  - Total Balance for APY: ${totalBalanceForAPY}`);

      supplyData = {
        balance: formatCurrency(totalBalance),
        apy: formatAPY(weightedAPY * 100),
        collateral: formatCurrency(totalCollateral),
      };

      console.log(
        `[AggregatedMarketUserSupplies] Final formatted supply data:`,
        supplyData,
      );
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
