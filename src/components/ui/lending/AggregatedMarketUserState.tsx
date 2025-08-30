import { useState, useMemo, useCallback, useEffect } from "react";
import { SingleMarketUserState } from "@/components/meta/SingleMarketUserState";
import { ChainId, EvmAddress, MarketUserState, AaveMarket } from "@/types/aave";
import { formatCurrency, formatAPY } from "@/utils/formatters";

interface MarketUserStateData {
  marketAddress: string;
  marketName: string;
  chainId: ChainId;
  data: MarketUserState | null;
  eModeEnabled: boolean | null;
  loading: boolean;
  error: boolean;
  hasData: boolean;
}

type EModeStatus = "enabled" | "disabled" | "mixed";

interface AggregatedMarketUserStateProps {
  activeMarkets: AaveMarket[];
  userWalletAddress: EvmAddress;
  children: (props: {
    globalData: {
      netWorth: string;
      netAPY: string;
    };
    eModeStatus: EModeStatus;
    loading: boolean;
    error: boolean;
    hasData: boolean;
    marketCount: number;
    marketData: Record<string, MarketUserStateData>;
  }) => React.ReactNode;
}

export const AggregatedMarketUserState: React.FC<
  AggregatedMarketUserStateProps
> = ({ activeMarkets, children, userWalletAddress }) => {
  const [marketDataMap, setMarketDataMap] = useState<
    Record<string, MarketUserStateData>
  >({});

  // create a set of current market keys for O(1) lookup
  const currentMarketKeys = useMemo(() => {
    return new Set(
      activeMarkets.map((market) => `${market.chainId}-${market.address}`),
    );
  }, [activeMarkets]);

  // clean up stale market data when activeMarkets change
  useEffect(() => {
    setMarketDataMap((prev) => {
      const filtered: Record<string, MarketUserStateData> = {};

      // only keep data for markets that are currently active
      Object.entries(prev).forEach(([key, data]) => {
        if (currentMarketKeys.has(key)) {
          filtered[key] = data;
        }
      });

      return filtered;
    });
  }, [currentMarketKeys]);

  const handleMarketDataChange = useCallback(
    (marketData: MarketUserStateData) => {
      const key = `${marketData.chainId}-${marketData.marketAddress}`;

      // only update if this market is currently active
      if (currentMarketKeys.has(key)) {
        setMarketDataMap((prev) => ({
          ...prev,
          [key]: marketData,
        }));
      }
    },
    [currentMarketKeys],
  );

  const aggregatedData = useMemo(() => {
    // filter marketDataMap to only include current markets
    const currentMarketData = Object.entries(marketDataMap)
      .filter(([key]) => currentMarketKeys.has(key))
      .map(([, data]) => data);

    // Calculate overall loading state - loading if any current market is loading
    const isLoading = currentMarketData.some(
      (marketData) => marketData.loading,
    );

    // Calculate overall error state - error if any current market has error
    const hasError = currentMarketData.some((marketData) => marketData.error);

    // Get valid states with data
    const validStates = currentMarketData.filter(
      (marketData) =>
        marketData.data && !marketData.loading && !marketData.error,
    );

    // Calculate e-mode status
    let eModeStatus: EModeStatus = "disabled";
    if (validStates.length > 0) {
      const eModeStatuses = validStates.map(
        (state) => state.data!.eModeEnabled,
      );
      const allEnabled = eModeStatuses.every((enabled) => enabled === true);
      const allDisabled = eModeStatuses.every((enabled) => enabled === false);

      if (allEnabled) {
        eModeStatus = "enabled";
      } else if (allDisabled) {
        eModeStatus = "disabled";
      } else {
        eModeStatus = "mixed";
      }
    }

    // Calculate aggregated global data
    let globalData = {
      netWorth: formatCurrency(0),
      netAPY: formatAPY(0),
    };

    if (validStates.length > 0) {
      // console.log('=== Aggregation Debug Info ===');
      // console.log('Valid states count:', validStates.length);

      // // Log individual market data for debugging
      // validStates.forEach((state, index) => {
      //   console.log(`Market ${index + 1} (${state.marketName}):`);
      //   console.log('  - netWorth.value:', state.data!.netWorth);
      //   console.log('  - netAPY.value:', state.data!.netAPY.value);
      //   console.log('  - netWorth parsed:', parseFloat(state.data!.netWorth) || 0);
      //   console.log('  - netAPY parsed:', parseFloat(state.data!.netAPY.value) || 0);
      // });

      // Calculate total net worth (sum of net_worth[i])
      const totalNetWorth = validStates.reduce((sum, state) => {
        const netWorth = parseFloat(state.data!.netWorth) || 0;
        return sum + netWorth;
      }, 0);

      // Filter out markets with exactly 0 net worth for APY calculation
      const marketsWithPositions = validStates.filter((state) => {
        const netWorth = parseFloat(state.data!.netWorth) || 0;
        return netWorth !== 0;
      });

      // Calculate weighted net APY only for markets where we have positions
      const weightedAPYNumerator = marketsWithPositions.reduce((sum, state) => {
        const netWorth = parseFloat(state.data!.netWorth) || 0;
        const apy = parseFloat(state.data!.netAPY.value) || 0;
        return sum + netWorth * apy;
      }, 0);

      // Sum of net worth only for markets where we have positions
      const totalNetWorthWithPositions = marketsWithPositions.reduce(
        (sum, state) => {
          const netWorth = parseFloat(state.data!.netWorth) || 0;
          return sum + netWorth;
        },
        0,
      );

      const netAPY =
        totalNetWorthWithPositions > 0
          ? weightedAPYNumerator / totalNetWorthWithPositions
          : 0;

      globalData = {
        netWorth: formatCurrency(totalNetWorth),
        netAPY: formatAPY(netAPY * 100),
      };
    }

    // Check if we have any data
    const hasData = validStates.length > 0;

    // Create filtered marketData object for children
    const filteredMarketData = Object.fromEntries(
      Object.entries(marketDataMap).filter(([key]) =>
        currentMarketKeys.has(key),
      ),
    );

    return {
      globalData,
      eModeStatus,
      loading: isLoading,
      error: hasError,
      hasData,
      marketCount: activeMarkets.length,
      marketData: filteredMarketData,
    };
  }, [marketDataMap, activeMarkets.length, currentMarketKeys]);

  return (
    <>
      {/* Render individual market components for data fetching */}
      {activeMarkets.map((market) => (
        <SingleMarketUserState
          key={`${market.chainId}-${market.address}`}
          market={market}
          onDataChange={handleMarketDataChange}
          userWalletAddress={userWalletAddress}
        />
      ))}

      {/* Render children with aggregated data */}
      {children(aggregatedData)}
    </>
  );
};
