import { useState, useMemo, useCallback, useEffect } from "react";
import { SingleMarketUserState } from "@/components/meta/SingleMarketUserState";
import {
  ChainId,
  EvmAddress,
  MarketUserState,
  Market,
  PercentValue,
  BigDecimal,
  EModeStatus,
} from "@/types/aave";
import { formatCurrency, formatPercentage } from "@/utils/formatters";

interface MarketUserStateData {
  marketAddress: string;
  marketName: string;
  chainId: ChainId;
  data: MarketUserState | null;
  eModeEnabled: boolean | null;
  healthFactor: BigDecimal | null;
  ltv: PercentValue | null;
  currentLiquidationThreshold: PercentValue | null;
  loading: boolean;
  error: boolean;
  hasData: boolean;
}

interface AggregatedMarketUserStateProps {
  activeMarkets: Market[];
  userWalletAddress: EvmAddress;
  children: (props: {
    globalData: {
      netWorth: string;
      netAPY: string;
    };
    healthFactorData: {
      show: boolean;
      value: string | null;
    };
    eModeStatus: EModeStatus;
    borrowData: {
      debt: string;
      collateral: string;
      borrowPercentUsed: string | null;
      marketData: Record<
        string,
        {
          debt: string;
          collateral: string;
          currentLtv: string | null;
        }
      >;
    };
    marketRiskData: Record<
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
    >;
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
      activeMarkets.map(
        (market) => `${market.chain.chainId}-${market.address}`,
      ),
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
    let eModeStatus: EModeStatus = "off";
    if (validStates.length > 0) {
      const eModeStatuses = validStates.map(
        (state) => state.data!.eModeEnabled,
      );
      const allEnabled = eModeStatuses.every((enabled) => enabled === true);
      const allDisabled = eModeStatuses.every((enabled) => enabled === false);

      if (allEnabled) {
        eModeStatus = "on";
      } else if (allDisabled) {
        eModeStatus = "off";
      } else {
        eModeStatus = "mixed";
      }
    }

    // Calculate health factor data
    const healthFactorData = {
      show: false,
      value: null as string | null,
    };

    if (validStates.length > 0) {
      // Get all non-null health factors
      const healthFactors = validStates
        .map((state) => state.healthFactor)
        .filter((hf): hf is BigDecimal => hf !== null);

      if (healthFactors.length > 0) {
        healthFactorData.show = true;

        if (healthFactors.length === 1) {
          // Single market - display its health factor value
          healthFactorData.value = healthFactors[0];
        } else {
          // Multiple markets - show "mixed"
          healthFactorData.value = "mixed";
        }
      }
    }

    // Calculate aggregated global data
    let globalData = {
      netWorth: formatCurrency(0),
      netAPY: formatPercentage(0),
    };

    if (validStates.length > 0) {
      // Calculate total net worth
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
      let netAPY = 0;
      if (marketsWithPositions.length > 0) {
        const weightedAPYNumerator = marketsWithPositions.reduce(
          (sum, state) => {
            const netWorth = parseFloat(state.data!.netWorth) || 0;
            const apy = parseFloat(state.data!.netAPY.value) || 0;
            return sum + netWorth * apy;
          },
          0,
        );

        const totalNetWorthWithPositions = marketsWithPositions.reduce(
          (sum, state) => {
            const netWorth = parseFloat(state.data!.netWorth) || 0;
            return sum + netWorth;
          },
          0,
        );

        netAPY =
          totalNetWorthWithPositions > 0
            ? weightedAPYNumerator / totalNetWorthWithPositions
            : 0;
      }

      globalData = {
        netWorth: formatCurrency(totalNetWorth),
        netAPY: formatPercentage(netAPY * 100),
      };
    }

    // Calculate enhanced borrow data
    let borrowData = {
      debt: formatCurrency(0),
      collateral: formatCurrency(0),
      borrowPercentUsed: null as string | null,
      marketData: {} as Record<
        string,
        {
          debt: string;
          collateral: string;
          currentLtv: string | null;
        }
      >,
    };

    if (validStates.length > 0) {
      const totalDebtBase = validStates.reduce((sum, state) => {
        return sum + parseFloat(state.data!.totalDebtBase);
      }, 0);

      const totalCollateralBase = validStates.reduce((sum, state) => {
        return sum + parseFloat(state.data!.totalCollateralBase);
      }, 0);

      // Calculate per-market debt, collateral, and current LTV
      const marketData: Record<
        string,
        {
          debt: string;
          collateral: string;
          currentLtv: string | null;
        }
      > = {};

      validStates.forEach((state) => {
        const marketKey = `${state.chainId}-${state.marketAddress}`;
        const marketDebt = parseFloat(state.data!.totalDebtBase);
        const marketCollateral = parseFloat(state.data!.totalCollateralBase);

        // Calculate current LTV as (debt * 100 / collateral)
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
      const healthFactors = validStates
        .map((state) => state.healthFactor)
        .filter((hf) => hf !== null);

      if (healthFactors.length > 0) {
        if (healthFactors.length === 1) {
          // Single market - use its individual data
          const market = validStates.find(
            (state) => state.healthFactor !== null,
          );
          if (market && market.ltv && market.data) {
            const marketDebt = parseFloat(market.data.totalDebtBase);
            const marketCollateral = parseFloat(
              market.data.totalCollateralBase,
            );
            const ltvValue = parseFloat(market.ltv.value);

            if (marketCollateral > 0) {
              const borrowUsed =
                (marketDebt * 100) / (marketCollateral * ltvValue);
              borrowPercentUsed = formatPercentage(borrowUsed);
            }
          }
        } else {
          borrowPercentUsed = "mixed";
        }
      }

      borrowData = {
        debt: formatCurrency(totalDebtBase),
        collateral: formatCurrency(totalCollateralBase),
        borrowPercentUsed,
        marketData,
      };
    }

    // Market-specific risk data (one entry per chainId-marketAddress combination)
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

    validStates.forEach((state) => {
      const marketKey = `${state.chainId}-${state.marketAddress}`;
      // Find the corresponding market from activeMarkets to get chain name and market name
      const market = activeMarkets.find(
        (m) =>
          m.chain.chainId === state.chainId &&
          m.address === state.marketAddress,
      );
      marketRiskData[marketKey] = {
        healthFactor: state.healthFactor,
        ltv: state.ltv
          ? formatPercentage(parseFloat(state.ltv.value) * 100)
          : null,
        currentLiquidationThreshold: state.currentLiquidationThreshold
          ? formatPercentage(
              parseFloat(state.currentLiquidationThreshold.value) * 100,
            )
          : null,
        chainId: state.chainId,
        chainName: market?.chain.name || "",
        chainIcon: market?.chain.icon || "",
        marketName: market?.name || "",
      };
    });

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
      healthFactorData,
      eModeStatus,
      borrowData,
      marketRiskData,
      loading: isLoading,
      error: hasError,
      hasData,
      marketCount: activeMarkets.length,
      marketData: filteredMarketData,
    };
  }, [marketDataMap, activeMarkets, currentMarketKeys]);

  return (
    <>
      {/* Render individual market components for data fetching */}
      {activeMarkets.map((market) => (
        <SingleMarketUserState
          key={`${market.chain.chainId}-${market.address}`}
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
