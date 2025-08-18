"use client";
import {
  useAaveMarkets,
  useAaveMarket,
  useBorrowAPYHistory,
  useSupplyAPYHistory,
} from "@aave/react";
import type {
  AaveMarketsDataProps,
  AaveSingleMarketDataProps,
  AaveAPYHistoryDataProps,
} from "@/types/aave";

/*
====================================================
PLEASE USE SUSPENSE MODE IN ALL HOOKS WHERE FEASIBLE
====================================================
*/

/**
 * Hook to fetch data for multiple Aave markets using Suspense pattern.
 * This hook will suspend the component until data is loaded.
 */
export const useAaveMarketsData = (props: AaveMarketsDataProps) => {
  const { data } = useAaveMarkets({
    chainIds: props.chainIds,
    user: props.user,
    borrowsOrderBy: props.borrowsOrderBy,
    suppliesOrderBy: props.suppliesOrderBy,
    suspense: true, 
  });

  return { markets: data };
};

/**
 * Hook to fetch data for a single Aave market using Suspense pattern.
 * This hook will suspend the component until data is loaded.
 */
export const useAaveSingleMarketData = (props: AaveSingleMarketDataProps) => {
  const { data } = useAaveMarket({
    address: props.address,
    chainId: props.chainId,
    user: props.user,
    borrowsOrderBy: props.borrowsOrderBy,
    suppliesOrderBy: props.suppliesOrderBy,
    suspense: true, 
  });

  return { market: data };
};

/**
 * Hook to fetch historical borrow APY using Suspense pattern.
 * This hook will suspend the component until data is loaded.
 */
export const useAaveBorrowAPYHistory = (props: AaveAPYHistoryDataProps) => {
  const { data } = useBorrowAPYHistory({
    chainId: props.chainId,
    underlyingToken: props.underlyingToken,
    market: props.market,
    window: props.window,
    suspense: true,
  });

  return { history: data };
};

/**
 * Hook to fetch historical supply APY using Suspense pattern.
 * This hook will suspend the component until data is loaded.
 */
export const useAaveSupplyAPYHistory = (props: AaveAPYHistoryDataProps) => {
  const { data } = useSupplyAPYHistory({
    chainId: props.chainId,
    underlyingToken: props.underlyingToken,
    market: props.market,
    window: props.window,
    suspense: true,
  });

  return { history: data };
};
