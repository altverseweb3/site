"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { evmAddress, bigDecimal } from "@aave/react";
import { useAaveWithdraw } from "@/hooks/aave/useAaveInteractions";
import { useChainSwitch } from "@/utils/swap/walletMethods";
import { truncateAddress } from "@/utils/formatters";
import { UnifiedMarketData, ChainId } from "@/types/aave";
import { Chain, Token } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";

export interface TokenWithdrawState {
  amount: string;
}

export interface WithdrawOperationDependencies {
  sourceChain: Chain | null;
  sourceToken: Token | null;
  userWalletAddress: string | null;
  tokenWithdrawState: TokenWithdrawState;
}

export interface WithdrawOperationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface WithdrawOperationHook {
  handleWithdraw: (market: UnifiedMarketData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const useWithdrawOperations = (
  dependencies: WithdrawOperationDependencies,
): WithdrawOperationHook => {
  const { sourceChain, sourceToken, userWalletAddress, tokenWithdrawState } =
    dependencies;
  const {
    executeWithdraw,
    loading: withdrawLoading,
    error: withdrawError,
  } = useAaveWithdraw();

  let marketChain;
  if (!sourceChain) {
    marketChain = getChainByChainId(1);
    console.error("No source chain provided, defaulting to Ethereum mainnet");
  } else {
    marketChain = sourceChain;
  }

  const { switchToChain } = useChainSwitch(marketChain);

  const handleWithdraw = useCallback(
    async (market: UnifiedMarketData): Promise<void> => {
      try {
        // Validate required dependencies
        if (!sourceToken || !tokenWithdrawState.amount || !userWalletAddress) {
          console.error("Missing required withdraw data");
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
        } catch {
          toast.error(
            "Chain switch failed, please try manually switching chains.",
          );
          return;
        }

        const withdrawToastId = toast.loading("Executing withdraw...", {
          description: "Please confirm the transaction in your wallet",
        });

        // Determine if we should use native token
        const useNative =
          sourceToken.ticker === market.marketInfo.chain.nativeWrappedToken;

        // Execute the withdraw operation
        const result = await executeWithdraw({
          market: evmAddress(market.marketInfo.address),
          amount: bigDecimal(tokenWithdrawState.amount),
          currency: evmAddress(sourceToken.address),
          chainId: market.marketInfo.chain.chainId as ChainId,
          useNative,
        });

        // Handle the result
        if (result.success) {
          console.log("Withdraw successful:", result.transactionHash);
          toast.success("Withdraw successful", {
            id: withdrawToastId,
            description: `Transaction hash: ${truncateAddress(
              result.transactionHash!,
            )}`,
          });
        } else {
          console.error("Withdraw failed:", result.error);
          toast.error("Withdraw failed", {
            id: withdrawToastId,
            description: result.error || "An unknown error occurred",
          });
        }
      } catch (error) {
        console.error("Withdraw operation failed:", error);
        toast.error("Withdraw operation failed", {
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
        });
      }
    },
    [
      sourceToken,
      tokenWithdrawState,
      userWalletAddress,
      sourceChain,
      executeWithdraw,
      switchToChain,
    ],
  );

  return {
    handleWithdraw,
    isLoading: withdrawLoading,
    error: typeof withdrawError === "string" ? withdrawError : null,
  };
};
