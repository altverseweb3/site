import { useAaveChains, UseAaveChainsArgs } from "@aave/react";

/**
 * Hook to fetch the list of supported chains on Aave.
 */
export const useAaveChainsData = (args: UseAaveChainsArgs) => {
  const { data, error } = useAaveChains(args);
  return { data, error };
};
