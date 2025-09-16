"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { evmAddress, bigDecimal } from "@aave/react";
import { useAaveBorrow } from "@/hooks/aave/useAaveInteractions";
import { useChainSwitch } from "@/utils/swap/walletMethods";
import { truncateAddress } from "@/utils/formatters";
import { UnifiedReserveData, ChainId } from "@/types/aave";
import { Chain, Token } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";

export interface TokenBorrowState {
  amount: string;
}

export interface BorrowOperationDependencies {
  sourceChain: Chain | null;
  sourceToken: Token | null;
  userWalletAddress: string | null;
  tokenBorrowState: TokenBorrowState;
}

export interface BorrowOperationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface BorrowOperationHook {
  handleBorrow: (market: UnifiedReserveData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const useBorrowOperations = (
  dependencies: BorrowOperationDependencies,
): BorrowOperationHook => {
  const { sourceChain, sourceToken, userWalletAddress, tokenBorrowState } =
    dependencies;
  const {
    executeBorrow,
    loading: borrowLoading,
    error: borrowError,
  } = useAaveBorrow();

  let marketChain;
  if (!sourceChain) {
    marketChain = getChainByChainId(1);
    console.error("No source chain provided, defaulting to Ethereum mainnet");
  } else {
    marketChain = sourceChain;
  }

  const { switchToChain } = useChainSwitch(marketChain);

  const handleBorrow = useCallback(
    async (market: UnifiedReserveData): Promise<void> => {
      try {
        // Validate required dependencies
        if (!sourceToken || !tokenBorrowState.amount || !userWalletAddress) {
          console.error("Missing required borrow data");
          toast.error("Missing required data", {
            description: "Please select a source token and enter an amount",
          });
          return;
        }

        if (!sourceChain) {
          console.error("Missing source chain");
          toast.error("Missing source chain", {
            description: "Please select a source chain",
          });
          return;
        }

        // Switch to correct chain FIRST before any operations
        try {
          await switchToChain(sourceChain);
        } catch (chainSwitchError) {
          console.error("Chain switch failed:", chainSwitchError);
          return;
        }

        const borrowToastId = toast.loading("Executing borrow...", {
          description: "Please confirm the transaction in your wallet",
        });

        // Determine if we should use native token
        const useNative =
          sourceToken.ticker === market.marketInfo.chain.nativeWrappedToken;

        // Execute the borrow operation
        const result = await executeBorrow({
          market: evmAddress(market.marketInfo.address),
          amount: bigDecimal(tokenBorrowState.amount),
          currency: evmAddress(sourceToken.address),
          chainId: market.marketInfo.chain.chainId as ChainId,
          useNative,
        });

        // Handle the result
        if (result.success) {
          console.log("Borrow successful:", result.transactionHash);
          toast.success("Borrow successful", {
            id: borrowToastId,
            description: `Transaction hash: ${truncateAddress(
              result.transactionHash!,
            )}`,
          });
        } else {
          console.error("Borrow failed:", result.error);
          toast.error("Borrow failed", {
            id: borrowToastId,
            description: result.error || "An unknown error occurred",
          });
        }
      } catch (error) {
        console.error("Borrow operation failed:", error);
        toast.error("Borrow operation failed", {
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
        });
      }
    },
    [
      sourceToken,
      tokenBorrowState,
      userWalletAddress,
      sourceChain,
      executeBorrow,
      switchToChain,
    ],
  );

  return {
    handleBorrow,
    isLoading: borrowLoading,
    error: typeof borrowError === "string" ? borrowError : null,
  };
};
