"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { evmAddress } from "@aave/react";
import { useAaveCollateral } from "@/hooks/aave/useAaveInteractions";
import { useChainSwitch } from "@/utils/swap/walletMethods";
import { truncateAddress, parseDepositError } from "@/utils/formatters";
import { UnifiedReserveData, ChainId } from "@/types/aave";
import { Chain } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";

export interface CollateralToggleOperationDependencies {
  userWalletAddress: string | null;
  targetChain: Chain | null;
  refetchMarkets: () => void;
}

export interface CollateralToggleOperationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface CollateralToggleOperationHook {
  handleCollateralToggle: (market: UnifiedReserveData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const useCollateralToggleOperations = (
  dependencies: CollateralToggleOperationDependencies,
): CollateralToggleOperationHook => {
  const { userWalletAddress, targetChain } = dependencies;
  const {
    executeCollateralToggle,
    loading: collateralLoading,
    error: collateralError,
  } = useAaveCollateral();

  let marketChain;
  if (!targetChain) {
    marketChain = getChainByChainId(1);
    console.error("No target chain provided, defaulting to Ethereum mainnet");
  } else {
    marketChain = targetChain;
  }

  const { switchToChain } = useChainSwitch(marketChain);

  const handleCollateralToggle = useCallback(
    async (market: UnifiedReserveData): Promise<void> => {
      try {
        // Validate required dependencies
        if (!userWalletAddress) {
          console.error("Missing user wallet address");
          toast.error("Missing wallet connection", {
            description: "Please connect your wallet",
          });
          return;
        }

        if (!targetChain) {
          console.error("Missing target chain");
          toast.error("Missing target chain", {
            description: "Please select a target chain",
          });
          return;
        }

        // Switch to correct chain FIRST before any operations
        try {
          await switchToChain(targetChain);
        } catch (chainSwitchError) {
          console.error("Chain switch failed:", chainSwitchError);
          toast.error("Chain switch failed", {
            description: parseDepositError(chainSwitchError),
          });
          return;
        }

        const collateralToastId = toast.loading(
          "Toggling collateral status...",
          {
            description: "Please confirm the transaction in your wallet",
          },
        );

        // Execute the collateral toggle operation
        const result = await executeCollateralToggle({
          market: evmAddress(market.marketInfo.address),
          underlyingToken: evmAddress(market.underlyingToken.address),
          user: evmAddress(userWalletAddress),
          chainId: market.marketInfo.chain.chainId as ChainId,
        });

        // Handle the result
        if (result.success) {
          console.log("Collateral toggle successful:", result.transactionHash);
          toast.success("Collateral status updated", {
            id: collateralToastId,
            description: `Transaction hash: ${truncateAddress(
              result.transactionHash!,
            )}`,
          });
          dependencies.refetchMarkets();
        } else {
          console.error("Collateral toggle failed:", result.error);
          toast.error("Collateral toggle failed", {
            id: collateralToastId,
            description: parseDepositError(
              result.error || "An unknown error occurred",
            ),
          });
        }
      } catch (error) {
        console.error("Collateral toggle operation failed:", error);
        toast.error("Collateral toggle operation failed", {
          description: parseDepositError(error),
        });
      }
    },
    [
      userWalletAddress,
      targetChain,
      executeCollateralToggle,
      switchToChain,
      dependencies,
    ],
  );

  return {
    handleCollateralToggle,
    isLoading: collateralLoading,
    error: typeof collateralError === "string" ? collateralError : null,
  };
};
