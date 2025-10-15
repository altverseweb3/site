"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { evmAddress } from "@aave/react";
import { useAaveEMode } from "@/hooks/aave/useAaveInteractions";
import { truncateAddress, parseDepositError } from "@/utils/formatters";
import {
  UnifiedReserveData,
  EmodeMarketCategory,
  UserBorrowData,
} from "@/types/aave";
import { getChainByChainId } from "@/config/chains";
import { useSwitchActiveNetwork } from "../dynamic/useUserWallets";
import { WalletType } from "@/types/web3";

export interface EmodeOperationDependencies {
  unifiedReserves: UnifiedReserveData[];
  userAddress: string | undefined;
  marketBorrowData: Record<string, UserBorrowData>;
  refetchMarkets?: () => void;
}

export interface EmodeOperationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface EmodeOperationHook {
  handleEmodeToggle: (
    selectedMarketData: {
      key: string;
      label: string;
      unifiedReserve: UnifiedReserveData;
      categories: EmodeMarketCategory[];
    },
    selectedCategory: {
      category: EmodeMarketCategory;
      isCurrentlyEnabled: boolean;
    },
    selectedCategoryId: number | null,
  ) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  hasIncompatiblePositions: (
    selectedMarketData: {
      key: string;
      label: string;
      unifiedReserve: UnifiedReserveData;
      categories: EmodeMarketCategory[];
    },
    selectedCategory: {
      category: EmodeMarketCategory;
      isCurrentlyEnabled: boolean;
    },
  ) => boolean;
  getMarketsWithEmode: () => Array<{
    key: string;
    label: string;
    unifiedReserve: UnifiedReserveData;
    categories: EmodeMarketCategory[];
  }>;
  getCategoryOptions: (
    selectedMarketData:
      | {
          key: string;
          label: string;
          unifiedReserve: UnifiedReserveData;
          categories: EmodeMarketCategory[];
        }
      | undefined,
  ) => Array<{
    category: EmodeMarketCategory;
    isCurrentlyEnabled: boolean;
  }>;
}

export const useEmodeOperations = (
  dependencies: EmodeOperationDependencies,
): EmodeOperationHook => {
  const { userAddress, unifiedReserves, marketBorrowData, refetchMarkets } =
    dependencies;

  const {
    executeEMode,
    loading: emodeLoading,
    error: emodeError,
  } = useAaveEMode();

  // Initialize chain switching with Ethereum as default
  const { switchNetwork, isLoading: isSwitchingNetwork } =
    useSwitchActiveNetwork(WalletType.EVM);

  const getMarketsWithEmode = useCallback(() => {
    const seenKeys = new Set();

    return unifiedReserves
      .filter(
        (market) =>
          market.marketInfo.eModeCategories &&
          market.marketInfo.eModeCategories.length > 0,
      )
      .map((market) => ({
        key: `${market.marketInfo.chain.chainId}-${market.marketInfo.address}`,
        label: `${market.marketInfo.chain.name} - ${market.marketName}`,
        unifiedReserve: market,
        categories: market.marketInfo.eModeCategories || [],
      }))
      .filter((market) => {
        if (seenKeys.has(market.key)) {
          return false;
        }
        seenKeys.add(market.key);
        return true;
      });
  }, [unifiedReserves]);

  // Get category options for selected market
  const getCategoryOptions = useCallback(
    (
      selectedMarketData:
        | {
            key: string;
            label: string;
            unifiedReserve: UnifiedReserveData;
            categories: EmodeMarketCategory[];
          }
        | undefined,
    ) => {
      if (!selectedMarketData) return [];

      return selectedMarketData.categories.map((category) => {
        // Check if this specific category is currently enabled by looking at borrow reserves
        let isCurrentlyEnabled = false;

        if (selectedMarketData.unifiedReserve.marketInfo.borrowReserves) {
          // Check if any borrow reserve has this category enabled in userState.emode
          isCurrentlyEnabled =
            selectedMarketData.unifiedReserve.marketInfo.borrowReserves.some(
              (reserve) => {
                return reserve.userState?.emode?.categoryId === category.id;
              },
            );
        }

        return {
          category,
          isCurrentlyEnabled,
        };
      });
    },
    [],
  );

  // Check if user has incompatible open borrow positions for e-mode
  const hasIncompatiblePositions = useCallback(
    (
      selectedMarketData: {
        key: string;
        label: string;
        unifiedReserve: UnifiedReserveData;
        categories: EmodeMarketCategory[];
      },
      selectedCategory: {
        category: EmodeMarketCategory;
        isCurrentlyEnabled: boolean;
      },
    ) => {
      if (!selectedMarketData || !selectedCategory) return false;

      // Get borrowable assets in the selected e-mode category
      const borrowableAssetsInCategory = new Set(
        selectedCategory.category.reserves
          .filter((reserve) => reserve.canBeBorrowed)
          .map((reserve) => reserve.underlyingToken.address.toLowerCase()),
      );

      // Get the market key for the selected market
      const marketKey = selectedMarketData.key;
      const userBorrowsForMarket = marketBorrowData[marketKey];

      if (!userBorrowsForMarket || !userBorrowsForMarket.borrows) {
        return false;
      }

      // Check each borrow position in the selected market
      return userBorrowsForMarket.borrows.some((borrowPosition) => {
        // Check if user has debt (borrowed amount > 0)
        const hasDebt = parseFloat(borrowPosition.debt.amount.value) > 0;

        if (!hasDebt) return false;

        // Check if this borrowed asset is NOT borrowable in the selected e-mode category
        const isIncompatible = !borrowableAssetsInCategory.has(
          borrowPosition.currency.address.toLowerCase(),
        );

        return isIncompatible;
      });
    },
    [marketBorrowData],
  );

  const handleEmodeToggle = useCallback(
    async (
      selectedMarketData: {
        key: string;
        label: string;
        unifiedReserve: UnifiedReserveData;
        categories: EmodeMarketCategory[];
      },
      selectedCategory: {
        category: EmodeMarketCategory;
        isCurrentlyEnabled: boolean;
      },
      selectedCategoryId: number | null,
    ): Promise<void> => {
      if (!selectedMarketData || !userAddress) return;

      try {
        // Get the required chain for the selected market
        const requiredChain = getChainByChainId(
          selectedMarketData.unifiedReserve.marketInfo.chain.chainId,
        );

        // Switch to the required chain
        const switchSuccess = await switchNetwork(requiredChain.chainId);

        if (!switchSuccess) {
          toast.error(`failed to switch to ${requiredChain.name}`);
          throw new Error(
            "failed to switch to the required network. please try again.",
          );
        }

        const categoryIdToSet = selectedCategory?.isCurrentlyEnabled
          ? null
          : selectedCategoryId;

        // Execute the e-mode operation
        const result = await executeEMode({
          market: evmAddress(
            selectedMarketData.unifiedReserve.marketInfo.address,
          ),
          user: evmAddress(userAddress),
          categoryId: categoryIdToSet,
          chainId: selectedMarketData.unifiedReserve.marketInfo.chain.chainId,
        });

        // Handle the result
        if (result.success) {
          console.log(
            "e-mode operation successful with hash:",
            result.transactionHash,
          );
          toast.success("e-mode operation completed successfully", {
            description: result.transactionHash
              ? `Transaction hash: ${truncateAddress(result.transactionHash)}`
              : undefined,
          });
          // Refetch markets data to reflect the updated state
          if (refetchMarkets) {
            refetchMarkets();
          }
        } else {
          console.error("e-mode operation failed:", result.error);
          toast.error("e-mode operation failed", {
            description: parseDepositError(
              result.error || "An unknown error occurred",
            ),
          });
        }
      } catch (error) {
        console.error("e-mode operation error:", error);
        toast.error("e-mode operation failed", {
          description: parseDepositError(error),
        });
      }
    },
    [userAddress, executeEMode, switchNetwork, refetchMarkets],
  );

  return {
    handleEmodeToggle,
    isLoading: emodeLoading || isSwitchingNetwork,
    error: typeof emodeError === "string" ? emodeError : null,
    hasIncompatiblePositions,
    getMarketsWithEmode,
    getCategoryOptions,
  };
};
