"use client";
import {
  useAaveMarkets,
  useAaveMarket,
  useBorrowAPYHistory,
  useSupplyAPYHistory,
  UseAaveMarketsArgs,
  UseAaveMarketArgs,
  UseBorrowAPYHistoryArgs,
  UseSupplyAPYHistoryArgs,
} from "@aave/react";

/*
===================================================================
Use suspense mode when loading large non-user interactive datasets.
For example, any data that would load naturally when we navigate to
/lending. For anything that would load after a user action, use the 
loading state pattern.

This is because suspense completely suspends the component from
rendering until the data is available.
===================================================================
*/

/**
 * Hook to fetch data for multiple Aave markets using Suspense pattern.
 * This hook will suspend the component until data is loaded.
 */
export const useAaveMarketsData = (args: UseAaveMarketsArgs) => {
  const { data } = useAaveMarkets({
    chainIds: args.chainIds,
    user: args.user,
    borrowsOrderBy: args.borrowsOrderBy,
    suppliesOrderBy: args.suppliesOrderBy,
    suspense: true,
  });

  return { markets: data };
};

/**
 * Hook to fetch data for a single Aave market using Suspense pattern.
 * This hook will suspend the component until data is loaded.
 */
export const useAaveSingleMarketData = (args: UseAaveMarketArgs) => {
  const { data } = useAaveMarket({
    address: args.address,
    chainId: args.chainId,
    user: args.user,
    borrowsOrderBy: args.borrowsOrderBy,
    suppliesOrderBy: args.suppliesOrderBy,
    suspense: true,
  });

  return { market: data ?? undefined };
};

/**
 * Hook to fetch historical borrow APY using Suspense pattern.
 * This hook will suspend the component until data is loaded.
 */
export const useAaveBorrowAPYHistory = (args: UseBorrowAPYHistoryArgs) => {
  const { data } = useBorrowAPYHistory({
    chainId: args.chainId,
    underlyingToken: args.underlyingToken,
    market: args.market,
    window: args.window,
    suspense: true,
  });

  return { history: data };
};

/**
 * Hook to fetch historical supply APY using Suspense pattern.
 * This hook will suspend the component until data is loaded.
 */
export const useAaveSupplyAPYHistory = (args: UseSupplyAPYHistoryArgs) => {
  const { data } = useSupplyAPYHistory({
    chainId: args.chainId,
    underlyingToken: args.underlyingToken,
    market: args.market,
    window: args.window,
    suspense: true,
  });

  return { history: data };
};
