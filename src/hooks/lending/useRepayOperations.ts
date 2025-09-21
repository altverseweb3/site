"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { ethers } from "ethers";
import { evmAddress, bigDecimal } from "@aave/react";
import { useAaveRepay, useAavePermit } from "@/hooks/aave/useAaveInteractions";
import { useChainSwitch } from "@/utils/swap/walletMethods";
import { truncateAddress, parseDepositError } from "@/utils/formatters";
import { UnifiedReserveData, ChainId } from "@/types/aave";
import { Chain, Token } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";

export interface TokenRepayState {
  amount: string;
}

export interface RepayOperationDependencies {
  sourceChain: Chain | null;
  sourceToken: Token | null;
  userWalletAddress: string | null;
  tokenRepayState: TokenRepayState;
  refetchMarkets: () => void;
}

export interface RepayOperationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface RepayOperationHook {
  handleRepay: (market: UnifiedReserveData, max: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const useRepayOperations = (
  dependencies: RepayOperationDependencies,
): RepayOperationHook => {
  const { sourceChain, sourceToken, userWalletAddress, tokenRepayState } =
    dependencies;
  const {
    executeRepay,
    loading: repayLoading,
    error: repayError,
  } = useAaveRepay();
  const { signPermit } = useAavePermit();

  let marketChain;
  if (!sourceChain) {
    marketChain = getChainByChainId(1);
    console.error("No source chain provided, defaulting to Ethereum mainnet");
  } else {
    marketChain = sourceChain;
  }

  const { switchToChain } = useChainSwitch(marketChain);

  const handleRepay = useCallback(
    async (market: UnifiedReserveData, max: boolean): Promise<void> => {
      try {
        // Validate required dependencies
        if (!sourceToken || !tokenRepayState.amount || !userWalletAddress) {
          console.error("Missing required repay data");
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

        const repayToastId = toast.loading("Executing repay...", {
          description: "Please confirm the transaction in your wallet",
        });

        let permitSignature;

        // Determine if we should use native token
        const useNative =
          sourceToken.ticker === market.marketInfo.chain.nativeWrappedToken;

        // Convert amount to wei using token decimals
        // Handle scientific notation by converting to fixed decimal string
        const normalizedAmount = parseFloat(tokenRepayState.amount).toFixed(
          sourceToken.decimals,
        );
        const amountInWei = ethers.parseUnits(
          normalizedAmount,
          sourceToken.decimals,
        );

        // Check if token supports EIP-2612 permits and we're not using native token
        const supportsPermit = market.permitSupported && !useNative;

        if (supportsPermit) {
          try {
            toast.loading("Creating permit signature...", {
              id: repayToastId,
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
        toast.loading("Executing repay...", {
          id: repayToastId,
          description:
            supportsPermit && permitSignature
              ? "Executing repay transaction..."
              : "Please confirm the transaction in your wallet",
        });

        // Execute the repay operation
        const result = await executeRepay({
          market: evmAddress(market.marketInfo.address),
          amount: bigDecimal(tokenRepayState.amount),
          currency: evmAddress(sourceToken.address),
          chainId: market.marketInfo.chain.chainId as ChainId,
          useNative,
          permitSig: permitSignature,
          max: max,
        });

        // Handle the result
        if (result.success) {
          console.log("Repay successful:", result.transactionHash);
          toast.success("Repay successful", {
            id: repayToastId,
            description: `Transaction hash: ${truncateAddress(
              result.transactionHash!,
            )}`,
          });
          dependencies.refetchMarkets();
        } else {
          console.error("Repay failed:", result.error);
          toast.error("Repay failed", {
            id: repayToastId,
            description: parseDepositError(
              result.error || "An unknown error occurred",
            ),
          });
        }
      } catch (error) {
        console.error("Repay operation failed:", error);
        toast.error("Repay operation failed", {
          description: parseDepositError(error),
        });
      }
    },
    [
      sourceToken,
      tokenRepayState,
      userWalletAddress,
      sourceChain,
      executeRepay,
      signPermit,
      switchToChain,
      dependencies,
    ],
  );

  return {
    handleRepay,
    isLoading: repayLoading,
    error: typeof repayError === "string" ? repayError : null,
  };
};
