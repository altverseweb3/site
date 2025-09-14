import { useState, useMemo, useCallback, useEffect } from "react";
import { evmAddress, chainId } from "@aave/react";
import {
  useAaveMarketsWithLoading,
  useAaveSingleMarketDataWithLoading,
} from "@/hooks/aave/useAaveMarketsData";
import {
  ChainId,
  EvmAddress,
  Market,
  MarketReservesRequestOrderBy,
  EModeStatus,
  BigDecimal,
  AggregatedUserState,
} from "@/types/aave";
import { formatCurrency, formatPercentage } from "@/utils/formatters";

interface MarketData {
  marketAddress: string;
  chainId: ChainId;
  data: Market | null;
  loading: boolean;
  error: boolean;
  hasData: boolean;
}

interface SingleMarketDataProps {
  marketAddress: string;
  chainId: ChainId;
  user?: EvmAddress;
  borrowsOrderBy?: MarketReservesRequestOrderBy;
  suppliesOrderBy?: MarketReservesRequestOrderBy;
  onDataChange: (marketData: MarketData) => void;
}

const SingleMarketData: React.FC<SingleMarketDataProps> = ({
  marketAddress,
  chainId: marketChainId,
  user,
  borrowsOrderBy,
  suppliesOrderBy,
  onDataChange,
}) => {
  const { market, loading } = useAaveSingleMarketDataWithLoading({
    address: evmAddress(marketAddress),
    chainId: chainId(marketChainId),
    user,
    borrowsOrderBy,
    suppliesOrderBy,
  });

  const error = !loading && !market;

  useEffect(() => {
    const marketData: MarketData = {
      marketAddress,
      chainId: marketChainId,
      data: market || null,
      loading,
      error,
      hasData: !!market,
    };

    onDataChange(marketData);
  }, [market, loading, error, marketAddress, marketChainId, onDataChange]);

  return null;
};

interface AggregatedMarketDataProps {
  chainIds: ChainId[];
  user?: EvmAddress;
  borrowsOrderBy?: MarketReservesRequestOrderBy;
  suppliesOrderBy?: MarketReservesRequestOrderBy;
  children: (props: {
    markets: Market[] | null;
    loading: boolean;
    error: boolean;
    hasData: boolean;
    refetchMarkets: () => void;
    aggregatedUserState: AggregatedUserState;
  }) => React.ReactNode;
}

// Calculate aggregated user state from markets' internal userState
const calculateAggregatedUserState = (
  activeMarkets: Market[],
): AggregatedUserState => {
  const validMarkets = activeMarkets.filter((market) => market.userState);

  if (validMarkets.length === 0) {
    return {
      globalData: {
        netWorth: formatCurrency(0),
        netAPY: formatPercentage(0),
      },
      healthFactorData: {
        show: false,
        value: null as string | null,
      },
      eModeStatus: "off" as EModeStatus,
      borrowData: {
        debt: formatCurrency(0),
        collateral: formatCurrency(0),
        borrowPercentUsed: null as string | null,
        marketData: {} as Record<
          string,
          { debt: string; collateral: string; currentLtv: string | null }
        >,
      },
      marketRiskData: {} as Record<
        string,
        {
          healthFactor: string | null;
          ltv: string | null;
          currentLiquidationThreshold: string | null;
          chainId: ChainId;
          chainName: string;
          chainIcon: string;
          marketName: string;
        }
      >,
    };
  }

  // Calculate total net worth
  const totalNetWorth = validMarkets.reduce((sum, market) => {
    const netWorth = parseFloat(market.userState!.netWorth) || 0;
    return sum + netWorth;
  }, 0);

  // Calculate weighted net APY for markets with positions
  const marketsWithPositions = validMarkets.filter((market) => {
    const netWorth = parseFloat(market.userState!.netWorth) || 0;
    return netWorth !== 0;
  });

  let netAPY = 0;
  if (marketsWithPositions.length > 0) {
    const weightedAPYNumerator = marketsWithPositions.reduce((sum, market) => {
      const netWorth = parseFloat(market.userState!.netWorth) || 0;
      const apy = parseFloat(market.userState!.netAPY.value) || 0;
      return sum + netWorth * apy;
    }, 0);

    const totalNetWorthWithPositions = marketsWithPositions.reduce(
      (sum, market) => {
        const netWorth = parseFloat(market.userState!.netWorth) || 0;
        return sum + netWorth;
      },
      0,
    );

    netAPY =
      totalNetWorthWithPositions > 0
        ? weightedAPYNumerator / totalNetWorthWithPositions
        : 0;
  }

  const globalData = {
    netWorth: formatCurrency(totalNetWorth),
    netAPY: formatPercentage(netAPY * 100),
  };

  // Calculate health factor data
  const healthFactors = validMarkets
    .map((market) => market.userState!.healthFactor)
    .filter((hf): hf is BigDecimal => hf !== null);

  const healthFactorData = {
    show: healthFactors.length > 0,
    value:
      healthFactors.length === 1
        ? healthFactors[0]
        : healthFactors.length > 1
          ? "mixed"
          : null,
  };

  // Calculate e-mode status
  const eModeStatuses = validMarkets.map(
    (market) => market.userState!.eModeEnabled,
  );
  const allEnabled = eModeStatuses.every((enabled) => enabled === true);
  const allDisabled = eModeStatuses.every((enabled) => enabled === false);
  const eModeStatus: EModeStatus = allEnabled
    ? "on"
    : allDisabled
      ? "off"
      : "mixed";

  // Calculate borrow data
  const totalDebtBase = validMarkets.reduce((sum, market) => {
    return sum + parseFloat(market.userState!.totalDebtBase);
  }, 0);

  const totalCollateralBase = validMarkets.reduce((sum, market) => {
    return sum + parseFloat(market.userState!.totalCollateralBase);
  }, 0);

  // Calculate per-market debt and collateral data
  const marketData: Record<
    string,
    { debt: string; collateral: string; currentLtv: string | null }
  > = {};
  validMarkets.forEach((market) => {
    const marketKey = `${market.chain.chainId}-${market.address}`;
    const marketDebt = parseFloat(market.userState!.totalDebtBase);
    const marketCollateral = parseFloat(market.userState!.totalCollateralBase);

    let currentLtv: string | null = null;
    if (marketCollateral > 0) {
      const ltvRatio = (marketDebt * 100) / marketCollateral;
      currentLtv = formatPercentage(ltvRatio);
    }

    marketData[marketKey] = {
      debt: formatCurrency(marketDebt),
      collateral: formatCurrency(marketCollateral),
      currentLtv,
    };
  });

  // Calculate borrow % used
  let borrowPercentUsed: string | null = null;
  if (healthFactors.length > 0) {
    if (healthFactors.length === 1) {
      const market = validMarkets.find(
        (m) => m.userState!.healthFactor !== null,
      );
      if (market && market.userState) {
        const marketDebt = parseFloat(market.userState.totalDebtBase);
        const marketCollateral = parseFloat(
          market.userState.totalCollateralBase,
        );
        const ltvValue = parseFloat(market.userState.ltv.value);

        if (marketCollateral > 0) {
          const borrowUsed = (marketDebt * 100) / (marketCollateral * ltvValue);
          borrowPercentUsed = formatPercentage(borrowUsed);
        }
      }
    } else {
      borrowPercentUsed = "mixed";
    }
  }

  const borrowData = {
    debt: formatCurrency(totalDebtBase),
    collateral: formatCurrency(totalCollateralBase),
    borrowPercentUsed,
    marketData,
  };

  // Market-specific risk data
  const marketRiskData: Record<
    string,
    {
      healthFactor: string | null;
      ltv: string | null;
      currentLiquidationThreshold: string | null;
      chainId: ChainId;
      chainName: string;
      chainIcon: string;
      marketName: string;
    }
  > = {};

  validMarkets.forEach((market) => {
    const marketKey = `${market.chain.chainId}-${market.address}`;
    marketRiskData[marketKey] = {
      healthFactor: market.userState!.healthFactor,
      ltv: market.userState!.ltv
        ? formatPercentage(parseFloat(market.userState!.ltv.value) * 100)
        : null,
      currentLiquidationThreshold: market.userState!.currentLiquidationThreshold
        ? formatPercentage(
            parseFloat(market.userState!.currentLiquidationThreshold.value) *
              100,
          )
        : null,
      chainId: market.chain.chainId as ChainId,
      chainName: market.chain.name,
      chainIcon: market.chain.icon,
      marketName: market.name,
    };
  });

  return {
    globalData,
    healthFactorData,
    eModeStatus,
    borrowData,
    marketRiskData,
  };
};

export const AggregatedMarketData: React.FC<AggregatedMarketDataProps> = ({
  chainIds,
  user,
  borrowsOrderBy,
  suppliesOrderBy,
  children,
}) => {
  const [marketDataMap, setMarketDataMap] = useState<
    Record<string, MarketData>
  >({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Create refetch function
  const refetchMarkets = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setMarketDataMap({}); // Clear existing data to force reload
  }, []);

  // First, get market addresses from the original useAaveMarketsWithLoading
  const { markets: marketAddresses, loading: addressesLoading } =
    useAaveMarketsWithLoading({
      chainIds,
      user,
      borrowsOrderBy,
      suppliesOrderBy,
    });

  // Extract market addresses and chainIds for individual calls
  const marketConfigs = useMemo(() => {
    if (!marketAddresses) return [];

    return marketAddresses.map((market) => ({
      address: market.address,
      chainId: market.chain.chainId as ChainId,
    }));
  }, [marketAddresses]);

  // Create a set of current market keys for O(1) lookup
  const currentMarketKeys = useMemo(() => {
    return new Set(
      marketConfigs.map((config) => `${config.chainId}-${config.address}`),
    );
  }, [marketConfigs]);

  // Clean up stale market data when marketConfigs change
  useEffect(() => {
    setMarketDataMap((prev) => {
      const filtered: Record<string, MarketData> = {};

      // Only keep data for markets that are currently configured
      Object.entries(prev).forEach(([key, data]) => {
        if (currentMarketKeys.has(key)) {
          filtered[key] = data;
        }
      });

      return filtered;
    });
  }, [currentMarketKeys]);

  const handleMarketDataChange = useCallback(
    (marketData: MarketData) => {
      const key = `${marketData.chainId}-${marketData.marketAddress}`;

      // Only update if this market is currently configured
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
    // Filter marketDataMap to only include current markets
    const currentMarketData = Object.entries(marketDataMap)
      .filter(([key]) => currentMarketKeys.has(key))
      .map(([, data]) => data);

    // Calculate overall loading state
    const isLoading =
      addressesLoading ||
      (marketConfigs.length > 0 &&
        currentMarketData.length < marketConfigs.length) ||
      currentMarketData.some((marketData) => marketData.loading);

    // Calculate overall error state
    const hasError = currentMarketData.some((marketData) => marketData.error);

    // Get valid markets with data
    const validMarkets = currentMarketData
      .filter((marketData) => marketData.data && !marketData.error)
      .map((marketData) => marketData.data!);

    // Check if we have any data
    const hasData = validMarkets.length > 0;

    // Calculate aggregated user state
    const aggregatedUserState = calculateAggregatedUserState(validMarkets);

    return {
      markets: hasData ? validMarkets : null,
      loading: isLoading,
      error: hasError,
      hasData,
      refetchMarkets,
      aggregatedUserState,
    };
  }, [
    marketDataMap,
    currentMarketKeys,
    addressesLoading,
    refetchMarkets,
    marketConfigs,
  ]);

  return (
    <>
      {/* Render individual market components for data fetching */}
      {marketConfigs.map((config) => (
        <SingleMarketData
          key={`${config.chainId}-${config.address}-${refreshKey}`}
          marketAddress={config.address}
          chainId={config.chainId}
          user={user}
          borrowsOrderBy={borrowsOrderBy}
          suppliesOrderBy={suppliesOrderBy}
          onDataChange={handleMarketDataChange}
        />
      ))}

      {/* Render children with aggregated data */}
      {children(aggregatedData)}
    </>
  );
};
