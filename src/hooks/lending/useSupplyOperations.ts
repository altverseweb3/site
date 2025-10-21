"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { ethers } from "ethers";
import { evmAddress, bigDecimal } from "@aave/react";
import { useAaveSupply, useAavePermit } from "@/hooks/aave/useAaveInteractions";
import { useChainSwitch } from "@/utils/swap/walletMethods";
import { truncateAddress, parseDepositError } from "@/utils/formatters";
import { UnifiedReserveData, ChainId } from "@/types/aave";
import { Chain, Token } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";
import { recordLending } from "@/utils/metrics/metricsRecorder";

export interface TokenTransferState {
  amount: string;
}

export interface SupplyOperationDependencies {
  sourceChain: Chain | null;
  sourceToken: Token | null;
  userWalletAddress: string | null;
  tokenTransferState: TokenTransferState;
  refetchMarkets: () => void;
}

export interface SupplyOperationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface SupplyOperationHook {
  handleSupply: (market: UnifiedReserveData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const useSupplyOperations = (
  dependencies: SupplyOperationDependencies,
): SupplyOperationHook => {
  const { sourceChain, sourceToken, userWalletAddress, tokenTransferState } =
    dependencies;
  const {
    executeSupply,
    loading: supplyLoading,
    error: supplyError,
  } = useAaveSupply();
  const { signPermit } = useAavePermit();
  let marketChain;
  if (!sourceChain) {
    marketChain = getChainByChainId(1); // This will never actually happen, it's just a type safeguard
    // since sourceChain comes from the web3Store and can be null when the store is not hydrated
    console.error("No source chain provided, defaulting to Ethereum mainnet");
  } else {
    marketChain = sourceChain;
  }

  const { switchToChain } = useChainSwitch(marketChain);

  const handleSupply = useCallback(
    async (market: UnifiedReserveData): Promise<void> => {
      try {
        // Validate required dependencies
        if (!sourceToken || !tokenTransferState.amount || !userWalletAddress) {
          console.error("Missing required supply data");
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

        const supplyToastId = toast.loading("Executing supply...", {
          description: "Please confirm the transaction in your wallet",
        });

        let permitSignature;

        // Determine if we should use native token
        const useNative =
          sourceToken.ticker === market.marketInfo.chain.nativeWrappedToken;

        // Convert amount to wei using token decimals
        const amountInWei = ethers.parseUnits(
          tokenTransferState.amount,
          sourceToken.decimals,
        );

        // Check if token supports EIP-2612 permits and we're not using native token
        const supportsPermit = market.permitSupported && !useNative;

        if (supportsPermit) {
          try {
            toast.loading("Creating permit signature...", {
              id: supplyToastId,
              description: "Please sign the permit message in your wallet",
            });

            permitSignature = await signPermit({
              amount: bigDecimal(amountInWei.toString()),
              chainId: market.marketInfo.chain.chainId as ChainId,
              currency: evmAddress(sourceToken.address),
              owner: evmAddress(userWalletAddress),
              spender: evmAddress(market.marketInfo.address),
            });

            console.log("Permit signature created successfully");

            // Small delay to ensure SDK state is properly reset
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (permitError) {
            console.warn(
              "Permit signing failed, falling back to standard approval:",
              permitError,
            );
            // Continue without permit - the SDK will handle standard approval
            permitSignature = undefined;
          }
        }

        // Update toast message based on permit availability
        toast.loading("Executing supply...", {
          id: supplyToastId,
          description:
            supportsPermit && permitSignature
              ? "Executing supply transaction..."
              : "Please confirm the transaction in your wallet",
        });

        // Execute the supply operation
        const result = await executeSupply({
          market: evmAddress(market.marketInfo.address),
          amount: bigDecimal(tokenTransferState.amount),
          currency: evmAddress(sourceToken.address),
          chainId: market.marketInfo.chain.chainId as ChainId,
          useNative,
          permitSig: permitSignature,
        });

        // Handle the result
        if (result.success) {
          console.log("Supply successful:", result.transactionHash);
          toast.success("Supply successful", {
            id: supplyToastId,
            description: `Transaction hash: ${truncateAddress(
              result.transactionHash!,
            )}`,
          });

          // Record lending metrics
          try {
            await recordLending({
              user_address: userWalletAddress,
              tx_hash: result.transactionHash || "",
              protocol: "aave",
              action: "supply",
              chain: market.marketInfo.chain.name,
              market_name: market.marketInfo.name,
              token_address: sourceToken.address,
              token_symbol: sourceToken.ticker,
              amount: tokenTransferState.amount,
              timestamp: Math.floor(Date.now() / 1000),
            });
          } catch (error) {
            console.error("Failed to record lending metrics:", error);
          }

          dependencies.refetchMarkets();
        } else {
          console.error("Supply failed:", result.error);
          toast.error("Supply failed", {
            id: supplyToastId,
            description: parseDepositError(
              result.error || "An unknown error occurred",
            ),
          });
        }
      } catch (error) {
        console.error("Supply operation failed:", error);
        toast.error("Supply operation failed", {
          description: parseDepositError(error),
        });
      }
    },
    [
      sourceToken,
      tokenTransferState,
      userWalletAddress,
      sourceChain,
      executeSupply,
      signPermit,
      switchToChain,
      dependencies,
    ],
  );

  return {
    handleSupply,
    isLoading: supplyLoading,
    error: typeof supplyError === "string" ? supplyError : null,
  };
};
