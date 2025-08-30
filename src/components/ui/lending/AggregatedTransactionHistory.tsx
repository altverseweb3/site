import { useState, useMemo, useCallback, useEffect } from "react";
import { SingleMarketTransactionHistory } from "@/components/meta/SingleMarketTransactionHistory";
import { ChainId, EvmAddress, UserTransactionItem } from "@/types/aave";
import { getTransactionKey } from "@/utils/lending/transactions";

interface MarketTransactionData {
  marketAddress: string;
  marketName: string;
  chainId: ChainId;
  data: UserTransactionItem[] | null;
  loading: boolean;
  error: boolean;
  hasData: boolean;
}

interface ActiveMarket {
  address: string;
  name: string;
  chainId: ChainId;
  isActive: boolean;
}

interface AggregatedTransactionHistoryProps {
  activeMarkets: ActiveMarket[];
  userWalletAddress: EvmAddress;
  children: (props: {
    transactions: UserTransactionItem[];
    loading: boolean;
    error: boolean;
    hasData: boolean;
    marketCount: number;
    marketData: Record<string, MarketTransactionData>;
  }) => React.ReactNode;
}

export const AggregatedTransactionHistory: React.FC<
  AggregatedTransactionHistoryProps
> = ({ activeMarkets, children, userWalletAddress }) => {
  const [marketDataMap, setMarketDataMap] = useState<
    Record<string, MarketTransactionData>
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
      const filtered: Record<string, MarketTransactionData> = {};

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
    (marketData: MarketTransactionData) => {
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

    // combine all transactions from current markets only
    const allTransactionsWithDuplicates = currentMarketData
      .filter((marketData) => marketData.data && marketData.data.length > 0)
      .flatMap((marketData) => {
        // give each transaction market context
        return marketData.data!.map((transaction) => ({
          ...transaction,
          _marketAddress: marketData.marketAddress,
          _marketName: marketData.marketName,
          _chainId: marketData.chainId,
        }));
      });

    // deduplicate transactions
    const seenTransactions = new Set<string>();
    const allTransactions = allTransactionsWithDuplicates
      .filter((transaction) => {
        const key = getTransactionKey(transaction);
        if (seenTransactions.has(key)) {
          return false; // duplicate found, filter out
        }
        seenTransactions.add(key);
        return true;
      })
      .sort((a, b) => {
        // Sort by date descending
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });

    // Calculate overall loading state - loading if any current market is loading
    const isLoading = currentMarketData.some(
      (marketData) => marketData.loading,
    );

    // Calculate overall error state - error if any current market has error
    const hasError = currentMarketData.some((marketData) => marketData.error);

    // Check if we have any data
    const hasData = allTransactions.length > 0;

    // Create filtered marketData object for children
    const filteredMarketData = Object.fromEntries(
      Object.entries(marketDataMap).filter(([key]) =>
        currentMarketKeys.has(key),
      ),
    );

    return {
      transactions: allTransactions,
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
        <SingleMarketTransactionHistory
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
