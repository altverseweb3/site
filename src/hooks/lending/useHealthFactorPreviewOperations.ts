"use client";

import { useCallback } from "react";
import { evmAddress, bigDecimal } from "@aave/react";
import { useHealthFactorPreview } from "@/hooks/aave/useAaveInteractions";
import {
  UnifiedReserveData,
  ChainId,
  EvmAddress,
  HealthFactorPreviewRequest,
  HealthFactorPreviewOperation,
  HealthFactorRiskLevel,
} from "@/types/aave";
import { Chain, Token } from "@/types/web3";

export interface HealthFactorPreviewArgs {
  operation: HealthFactorPreviewOperation;
  market: UnifiedReserveData;
  amount: string;
  currency: EvmAddress;
  chainId: ChainId;
  userAddress: EvmAddress;
  useNative?: boolean;
  max?: boolean; // For repay/withdraw operations
}

export interface HealthFactorPreviewResult {
  success: boolean;
  healthFactorBefore?: string;
  healthFactorAfter?: string;
  liquidationRisk?: HealthFactorRiskLevel;
  error?: string;
}

export interface HealthFactorPreviewOperationDependencies {
  sourceChain: Chain | null;
  sourceToken: Token | null;
  userWalletAddress: string | null;
}

export interface HealthFactorPreviewOperationHook {
  previewHealthFactor: (
    args: Omit<HealthFactorPreviewArgs, "userAddress" | "chainId">,
  ) => Promise<HealthFactorPreviewResult>;
  isLoading: boolean;
  error: string | null;
}

export const useHealthFactorPreviewOperations = (
  dependencies: HealthFactorPreviewOperationDependencies,
): HealthFactorPreviewOperationHook => {
  const { sourceChain, userWalletAddress } = dependencies;
  const { executePreview, loading, error } = useHealthFactorPreview();

  const previewHealthFactor = useCallback(
    async (
      args: Omit<HealthFactorPreviewArgs, "userAddress" | "chainId">,
    ): Promise<HealthFactorPreviewResult> => {
      try {
        // Validate required dependencies
        if (!userWalletAddress) {
          return {
            success: false,
            error: "User wallet address is required",
          };
        }

        if (!sourceChain) {
          return {
            success: false,
            error: "Source chain is required",
          };
        }

        const {
          operation,
          market,
          amount,
          currency,
          useNative = false,
          max = false,
        } = args;

        // Build the health factor preview request based on operation type
        let previewRequest: HealthFactorPreviewRequest;

        const userAddress = evmAddress(userWalletAddress);
        const marketAddress = evmAddress(market.marketInfo.address);
        const chainId = market.marketInfo.chain.chainId as ChainId;

        switch (operation) {
          case "borrow":
            previewRequest = {
              action: {
                borrow: {
                  market: marketAddress,
                  amount: useNative
                    ? {
                        native: bigDecimal(amount),
                      }
                    : {
                        erc20: {
                          currency,
                          value: bigDecimal(amount),
                        },
                      },
                  sender: userAddress,
                  chainId,
                },
              },
            };
            break;

          case "supply":
            previewRequest = {
              action: {
                supply: {
                  market: marketAddress,
                  amount: useNative
                    ? {
                        native: bigDecimal(amount),
                      }
                    : {
                        erc20: {
                          currency,
                          value: bigDecimal(amount),
                        },
                      },
                  sender: userAddress,
                  chainId,
                },
              },
            };
            break;

          case "repay":
            previewRequest = {
              action: {
                repay: {
                  market: marketAddress,
                  amount: useNative
                    ? {
                        native: bigDecimal(amount), // For native repay, max logic should be handled at higher level
                      }
                    : {
                        erc20: {
                          currency,
                          value: max
                            ? ({ max: true } as const)
                            : ({ exact: bigDecimal(amount) } as const),
                        },
                      },
                  sender: userAddress,
                  chainId,
                },
              },
            };
            break;

          case "withdraw":
            previewRequest = {
              action: {
                withdraw: {
                  market: marketAddress,
                  amount: useNative
                    ? {
                        native: {
                          value: max
                            ? ({ max: true } as const)
                            : ({ exact: bigDecimal(amount) } as const),
                        },
                      }
                    : {
                        erc20: {
                          currency,
                          value: max
                            ? ({ max: true } as const)
                            : ({ exact: bigDecimal(amount) } as const),
                        },
                      },
                  sender: userAddress,
                  chainId,
                },
              },
            };
            break;

          default:
            return {
              success: false,
              error: `Unsupported operation: ${operation}`,
            };
        }

        // Execute the health factor preview
        const response = await executePreview(previewRequest);

        if (!response) {
          return {
            success: false,
            error: "Failed to get health factor preview response",
          };
        }

        // Extract health factors from response
        const healthFactorBefore = response.before?.toString();
        const healthFactorAfter = response.after?.toString();

        // Check if the operation would create liquidation risk
        // Health factor < 1 indicates liquidation risk
        // Health factor between 1 and 1.5 is a warning zone
        const liquidationRisk = healthFactorAfter
          ? parseFloat(healthFactorAfter) < 1.0
            ? "danger"
            : parseFloat(healthFactorAfter) < 1.5
              ? "warning"
              : "ok"
          : "ok";

        return {
          success: true,
          healthFactorBefore,
          healthFactorAfter,
          liquidationRisk,
        };
      } catch (error) {
        console.error("Health factor preview failed:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Health factor preview failed",
        };
      }
    },
    [executePreview, userWalletAddress, sourceChain],
  );

  return {
    previewHealthFactor,
    isLoading: loading,
    error: typeof error === "string" ? error : null,
  };
};
