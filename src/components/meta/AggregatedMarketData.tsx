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
} from "@/types/aave";

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
  }) => React.ReactNode;
}

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
      currentMarketData.some((marketData) => marketData.loading);

    // Calculate overall error state
    const hasError = currentMarketData.some((marketData) => marketData.error);

    // Get valid markets with data
    const validMarkets = currentMarketData
      .filter((marketData) => marketData.data && !marketData.error)
      .map((marketData) => marketData.data!);

    // Check if we have any data
    const hasData = validMarkets.length > 0;

    return {
      markets: hasData ? validMarkets : null,
      loading: isLoading,
      error: hasError,
      hasData,
    };
  }, [marketDataMap, currentMarketKeys, addressesLoading]);

  return (
    <>
      {/* Render individual market components for data fetching */}
      {marketConfigs.map((config) => (
        <SingleMarketData
          key={`${config.chainId}-${config.address}`}
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
