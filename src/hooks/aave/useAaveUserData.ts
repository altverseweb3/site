"use client";
import {
  useUserSupplies,
  useUserBorrows,
  useUserMarketState,
  UseUserSuppliesArgs,
  UseUserBorrowsArgs,
  UseUserStateArgs,
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
 * Hook to fetch data for user supplies.
 * This hook will suspend the component until data is loaded.
 */
export const useAaveUserSupplies = (args: UseUserSuppliesArgs) => {
  const { data } = useUserSupplies({
    markets: args.markets,
    user: args.user,
    suspense: true,
  });

  return { data };
};

/**
 * Hook to fetch data for user borrows.
 * This hook will suspend the component until data is loaded.
 */
export const useAaveUserBorrows = (args: UseUserBorrowsArgs) => {
  const { data } = useUserBorrows({
    markets: args.markets,
    user: args.user,
    suspense: true,
  });

  return { data };
};

/**
 * Hook to fetch data for user market state.
 * This hook will suspend the component until data is loaded.
 */
export const useAaveUserMarketState = (args: UseUserStateArgs) => {
  const { data } = useUserMarketState({
    chainId: args.chainId,
    market: args.market,
    user: args.user,
    suspense: true,
  });

  return { data };
};
