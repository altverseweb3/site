import { useState, useCallback } from "react";
import { MayanSwapService } from "@/utils/swap/swapHistory";
import { SwapQueryResult, SwapData } from "@/types/web3";
import {
  useConnectedWalletSummary,
  useGetUserWalletAddresses,
} from "@/hooks/dynamic/useUserWallets";

interface SwapHistoryState {
  isLoading: boolean;
  isLoadingMore: boolean;
  loadingProgress: {
    current: number;
    total: number;
    stage: string;
  } | null;
  data: SwapQueryResult[];
  allSwaps: SwapData[];
  error: string | null;
  summary: {
    totalQueries: number;
    successfulQueries: number;
    totalSwaps: number;
    swapsByChain: Record<"EVM" | "SOL" | "SUI", number>;
  } | null;
}

interface UseSwapHistoryReturn extends SwapHistoryState {
  fetchSwapHistory: () => Promise<void>;
  clearHistory: () => void;
  walletSummary: {
    hasEVM: boolean;
    hasSolana: boolean;
    hasSUI: boolean;
    totalConnected: number;
    walletsByType: Record<string, string>;
  };
}

/**
 * Deduplicates swaps based on unique identifiers
 * Uses orderId as primary key, falls back to sourceTxHash if orderId is not available
 */
const deduplicateSwaps = (swaps: SwapData[]): SwapData[] => {
  const uniqueSwaps = new Map<string, SwapData>();

  swaps.forEach((swap) => {
    // Use orderId as primary unique identifier, fallback to sourceTxHash
    const primaryKey = swap.orderId;
    const fallbackKey = swap.sourceTxHash;

    // Create a unique key, preferring orderId but using sourceTxHash if orderId is empty
    const uniqueKey =
      primaryKey && primaryKey.trim() !== ""
        ? `order:${primaryKey}`
        : fallbackKey && fallbackKey.trim() !== ""
          ? `tx:${fallbackKey}`
          : null;

    if (uniqueKey) {
      // Only keep the first occurrence of each unique swap
      if (!uniqueSwaps.has(uniqueKey)) {
        uniqueSwaps.set(uniqueKey, swap);
      } else {
        // Optional: Log when duplicates are found for debugging
        console.debug("Duplicate swap filtered out:", {
          orderId: swap.orderId,
          sourceTxHash: swap.sourceTxHash,
          fromToken: swap.fromTokenSymbol,
          toToken: swap.toTokenSymbol,
          amount: swap.fromAmount,
          initiatedAt: swap.initiatedAt,
        });
      }
    } else {
      // Handle edge case where both orderId and sourceTxHash are missing
      console.warn(
        "Swap found without orderId or sourceTxHash, cannot deduplicate:",
        swap,
      );
      // Still include it, but with a fallback key to avoid losing valid data
      const fallbackKey = `${swap.fromTokenSymbol}-${swap.toTokenSymbol}-${swap.fromAmount}-${swap.initiatedAt}`;
      if (!uniqueSwaps.has(fallbackKey)) {
        uniqueSwaps.set(fallbackKey, swap);
      }
    }
  });

  return Array.from(uniqueSwaps.values());
};

export const useSwapHistory = (): UseSwapHistoryReturn => {
  const [state, setState] = useState<SwapHistoryState>({
    isLoading: false,
    isLoadingMore: false,
    loadingProgress: null,
    data: [],
    allSwaps: [],
    error: null,
    summary: null,
  });

  const walletSummary = useConnectedWalletSummary();

  // Extract user wallets at the top level of the hook
  const userWallets = useGetUserWalletAddresses();

  const clearHistory = useCallback(() => {
    setState({
      isLoading: false,
      isLoadingMore: false,
      loadingProgress: null,
      data: [],
      allSwaps: [],
      error: null,
      summary: null,
    });
  }, []);

  const fetchSwapHistory = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      isLoadingMore: prev.allSwaps.length > 0, // If we have existing data, this is a "load more"
      error: null,
      loadingProgress: {
        current: 0,
        total: 0,
        stage: "initializing...",
      },
    }));

    try {
      // Check if any wallets are connected
      if (walletSummary.totalConnected === 0) {
        throw new Error("No wallets connected");
      }

      // Check if we have at least one valid address
      const hasValidAddress = Object.values(userWallets).some(
        (address) => address,
      );
      if (!hasValidAddress) {
        throw new Error("No valid wallet addresses found");
      }

      // Calculate total expected queries for progress tracking
      const walletAddresses = Object.values(userWallets).filter(Boolean);
      const referrerAddresses = 3; // EVM, SOL, SUI
      const totalQueries = walletAddresses.length * referrerAddresses;

      setState((prev) => ({
        ...prev,
        loadingProgress: {
          current: 0,
          total: totalQueries,
          stage: "querying swap data across all chains...",
        },
      }));

      // Fetch swap history
      const mayanSwapService = new MayanSwapService();
      const result = await mayanSwapService.getSwapsForUserWallets(userWallets);

      setState((prev) => ({
        ...prev,
        loadingProgress: {
          current: totalQueries,
          total: totalQueries,
          stage: "processing and deduplicating results...",
        },
      }));

      // Flatten all swaps from all results
      const allSwapsRaw = result.results.flatMap((r) => r.response.data);

      // Deduplicate swaps to remove duplicates from multiple referrer queries
      const deduplicatedSwaps = deduplicateSwaps(allSwapsRaw);

      // Sort by initiation date (most recent first)
      deduplicatedSwaps.sort(
        (a, b) =>
          new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime(),
      );

      // Update summary with deduplicated count
      const updatedSummary = {
        ...result.summary,
        totalSwaps: deduplicatedSwaps.length,
      };

      setState({
        isLoading: false,
        isLoadingMore: false,
        loadingProgress: null,
        data: result.results,
        allSwaps: deduplicatedSwaps,
        error: null,
        summary: updatedSummary,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch swap history";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
        loadingProgress: null,
        error: errorMessage,
      }));
      console.error("❌ Error fetching swap history:", error);
    }
  }, [walletSummary.totalConnected, userWallets]);

  return {
    ...state,
    fetchSwapHistory,
    clearHistory,
    walletSummary,
  };
};
