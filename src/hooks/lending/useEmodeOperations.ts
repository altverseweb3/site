"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { evmAddress } from "@aave/react";
import { useAaveEMode } from "@/hooks/aave/useAaveInteractions";
import { useChainSwitch } from "@/utils/swap/walletMethods";
import { truncateAddress } from "@/utils/formatters";
import { Market, EmodeMarketCategory, UserBorrowData } from "@/types/aave";
import { getChainByChainId } from "@/config/chains";

export interface EmodeOperationDependencies {
  userAddress: string | null;
  activeMarkets: Market[];
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
      market: Market;
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
      market: Market;
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
    market: Market;
    categories: EmodeMarketCategory[];
  }>;
  getCategoryOptions: (
    selectedMarketData:
      | {
          key: string;
          label: string;
          market: Market;
          categories: EmodeMarketCategory[];
        }
      | undefined,
  ) => Array<{
    category: EmodeMarketCategory;
    isCurrentlyEnabled: boolean;
  }>;
  getCurrentEmodeCategory: (
    selectedMarketData:
      | {
          key: string;
          label: string;
          market: Market;
          categories: EmodeMarketCategory[];
        }
      | undefined,
  ) => number | undefined;
}

export const useEmodeOperations = (
  dependencies: EmodeOperationDependencies,
): EmodeOperationHook => {
  const { userAddress, activeMarkets, marketBorrowData, refetchMarkets } =
    dependencies;

  const {
    executeEMode,
    loading: emodeLoading,
    error: emodeError,
  } = useAaveEMode();

  // Initialize chain switching with Ethereum as default
  const { switchToChain, isLoading: isChainSwitching } = useChainSwitch(
    getChainByChainId(1),
  );

  // Filter markets that have eMode categories
  const getMarketsWithEmode = useCallback(() => {
    return activeMarkets
      .filter(
        (market) => market.eModeCategories && market.eModeCategories.length > 0,
      )
      .map((market) => ({
        key: `${market.chain.chainId}-${market.address}`,
        label: `${market.chain.name} - ${market.name}`,
        market,
        categories: market.eModeCategories || [],
      }));
  }, [activeMarkets]);

  // Get current emode category for a selected market
  const getCurrentEmodeCategory = useCallback(
    (
      selectedMarketData:
        | {
            key: string;
            label: string;
            market: Market;
            categories: EmodeMarketCategory[];
          }
        | undefined,
    ) => {
      return selectedMarketData?.market.borrowReserves?.find(
        (reserve) => reserve.userState?.emode?.categoryId !== undefined,
      )?.userState?.emode?.categoryId;
    },
    [],
  );

  // Get category options for selected market
  const getCategoryOptions = useCallback(
    (
      selectedMarketData:
        | {
            key: string;
            label: string;
            market: Market;
            categories: EmodeMarketCategory[];
          }
        | undefined,
    ) => {
      if (!selectedMarketData) return [];

      return selectedMarketData.categories.map((category) => {
        // Check if this specific category is currently enabled by looking at borrow reserves
        let isCurrentlyEnabled = false;

        if (selectedMarketData.market.borrowReserves) {
          // Check if any borrow reserve has this category enabled in userState.emode
          isCurrentlyEnabled = selectedMarketData.market.borrowReserves.some(
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
        market: Market;
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
        market: Market;
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
          selectedMarketData.market.chain.chainId,
        );

        // Switch to the required chain
        const switchSuccess = await switchToChain(requiredChain);

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
          market: evmAddress(selectedMarketData.market.address),
          user: evmAddress(userAddress),
          categoryId: categoryIdToSet,
          chainId: selectedMarketData.market.chain.chainId,
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
            description: result.error || "An unknown error occurred",
          });
        }
      } catch (error) {
        console.error("e-mode operation error:", error);
        toast.error("e-mode operation failed", {
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
        });
      }
    },
    [userAddress, executeEMode, switchToChain, refetchMarkets],
  );

  return {
    handleEmodeToggle,
    isLoading: emodeLoading || isChainSwitching,
    error: typeof emodeError === "string" ? emodeError : null,
    hasIncompatiblePositions,
    getMarketsWithEmode,
    getCategoryOptions,
    getCurrentEmodeCategory,
  };
};
