"use client";

import {
  useSupply,
  useBorrow,
  useRepay,
  useWithdraw,
  evmAddress,
  signatureFrom,
} from "@aave/react";
import {
  SupplyState,
  SupplyArgs,
  SupplyResult,
  BorrowState,
  BorrowArgs,
  BorrowResult,
  RepayState,
  RepayArgs,
  RepayResult,
  WithdrawState,
  WithdrawArgs,
  WithdrawResult,
  EvmAddress,
  BigDecimal,
  ChainId,
} from "@/types/aave";
import { useReownWalletProviderAndSigner } from "@/hooks/useReownWalletProviderAndSigner";
import { useCallback, useState } from "react";
import { ethers } from "ethers";

/**
 * Hook for executing Aave supply operations
 * Handles both direct supply and supply with permit functionality
 */
export const useAaveSupply = () => {
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const [supply, supplying] = useSupply();
  const [state, setState] = useState<SupplyState>({
    loading: false,
    error: null,
  });

  // Custom transaction sender that works with our async signer
  const sendTransaction = useCallback(
    async (transactionRequest: {
      to: string;
      data: string;
      value?: string | number;
      gas?: string | number;
      gasPrice?: string | number;
      maxFeePerGas?: string | number;
      maxPriorityFeePerGas?: string | number;
    }) => {
      const signer = await getEvmSigner();

      // Convert the transaction request to ethers format
      const tx = {
        to: transactionRequest.to,
        data: transactionRequest.data,
        value: transactionRequest.value || 0,
        gasLimit: transactionRequest.gas,
        gasPrice: transactionRequest.gasPrice,
        maxFeePerGas: transactionRequest.maxFeePerGas,
        maxPriorityFeePerGas: transactionRequest.maxPriorityFeePerGas,
      };

      const response = await signer.sendTransaction(tx);
      await response.wait(); // Wait for confirmation
      return response.hash;
    },
    [getEvmSigner],
  );

  /**
   * Execute a supply operation
   */
  const executeSupply = useCallback(
    async (args: SupplyArgs): Promise<SupplyResult> => {
      // Check if another supply operation is already in progress
      if (supplying.loading) {
        const errorMessage = "Another supply operation is already in progress";
        setState({ loading: false, error: errorMessage });
        return {
          success: false,
          error: errorMessage,
        };
      }

      setState({ loading: true, error: null });

      try {
        const signer = await getEvmSigner();
        const userAddress = await signer.getAddress();

        // Prepare the supply configuration
        const supplyConfig = {
          market: args.market,
          amount: args.useNative
            ? {
                native: args.amount,
              }
            : {
                erc20: {
                  currency: args.currency,
                  value: args.amount,
                  permitSig: args.permitSig
                    ? {
                        deadline: Number(args.permitSig.deadline),
                        value: args.permitSig.signature,
                      }
                    : undefined,
                },
              },
          sender: evmAddress(userAddress),
          chainId: args.chainId,
          ...(args.onBehalfOf && { onBehalfOf: args.onBehalfOf }),
        };

        // Execute the supply operation using manual transaction handling
        const planResult = await supply(supplyConfig);

        if (planResult.isErr()) {
          throw planResult.error;
        }

        const plan = planResult.value;
        let transactionHash: string;

        switch (plan.__typename) {
          case "TransactionRequest":
            // Single transaction execution
            transactionHash = await sendTransaction(plan);
            break;

          case "ApprovalRequired":
            // Approval + transaction sequence
            const approvalHash = await sendTransaction(plan.approval);
            console.log("Approval transaction:", approvalHash);

            transactionHash = await sendTransaction(plan.originalTransaction);
            break;

          case "InsufficientBalanceError":
            throw new Error(
              `Insufficient balance: ${plan.required.value} required.`,
            );

          default:
            throw new Error("Unknown execution plan type");
        }

        const finalResult: SupplyResult = {
          success: true,
          transactionHash,
        };

        setState({ loading: false, error: null });
        return finalResult;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Supply operation failed";
        console.error("Supply failed:", error);

        setState({ loading: false, error: errorMessage });
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [supply, sendTransaction, getEvmSigner, supplying.loading],
  );

  return {
    executeSupply,
    loading: state.loading || supplying.loading,
    error: state.error || supplying.error,
  };
};

/**
 * Hook for creating permit signatures for ERC-20 tokens
 * This allows gasless approvals when supplying ERC-20 tokens
 */
export const useAavePermit = () => {
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
  }>({
    loading: false,
    error: null,
  });

  /**
   * Sign a permit for ERC-20 token approval
   */
  const signPermit = useCallback(
    async (args: {
      amount: BigDecimal;
      chainId: ChainId;
      currency: EvmAddress;
      owner: EvmAddress;
      spender: EvmAddress;
      deadline?: bigint;
    }) => {
      setState({ loading: true, error: null });

      try {
        const signer = await getEvmSigner();
        const deadline =
          args.deadline || BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

        // Get the token contract
        const tokenContract = new ethers.Contract(
          args.currency,
          [
            "function name() view returns (string)",
            "function version() view returns (string)",
            "function nonces(address) view returns (uint256)",
          ],
          signer,
        );

        // Get domain info and nonce
        const [name, version, nonce] = await Promise.all([
          tokenContract.name(),
          tokenContract.version().catch(() => "1"), // Default to "1" if version() doesn't exist
          tokenContract.nonces(args.owner),
        ]);

        // Create the domain
        const domain = {
          name,
          version,
          chainId: Number(args.chainId),
          verifyingContract: args.currency,
        };

        // Create the permit message
        const types = {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        };

        const message = {
          owner: args.owner,
          spender: args.spender,
          value: args.amount.toString(),
          nonce: nonce.toString(),
          deadline: deadline.toString(),
        };

        // Sign the permit
        const signature = await signer.signTypedData(domain, types, message);

        const permitSig = {
          deadline,
          signature: signatureFrom(signature),
        };

        setState({ loading: false, error: null });
        return permitSig;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Permit signing failed";
        console.error("Permit signing failed:", error);

        setState({ loading: false, error: errorMessage });
        throw new Error(errorMessage);
      }
    },
    [getEvmSigner],
  );

  return {
    signPermit,
    loading: state.loading,
    error: state.error,
  };
};

/**
 * Hook for executing Aave borrow operations
 * Handles borrowing assets against supplied collateral
 */
export const useAaveBorrow = () => {
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const [borrow, borrowing] = useBorrow();
  const [state, setState] = useState<BorrowState>({
    loading: false,
    error: null,
  });

  // Custom transaction sender that works with our async signer
  const sendTransaction = useCallback(
    async (transactionRequest: {
      to: string;
      data: string;
      value?: string | number;
      gas?: string | number;
      gasPrice?: string | number;
      maxFeePerGas?: string | number;
      maxPriorityFeePerGas?: string | number;
    }) => {
      const signer = await getEvmSigner();

      const tx = {
        to: transactionRequest.to,
        data: transactionRequest.data,
        value: transactionRequest.value || 0,
        gasLimit: transactionRequest.gas,
        gasPrice: transactionRequest.gasPrice,
        maxFeePerGas: transactionRequest.maxFeePerGas,
        maxPriorityFeePerGas: transactionRequest.maxPriorityFeePerGas,
      };

      const response = await signer.sendTransaction(tx);
      await response.wait();
      return response.hash;
    },
    [getEvmSigner],
  );

  /**
   * Execute a borrow operation
   */
  const executeBorrow = useCallback(
    async (args: BorrowArgs): Promise<BorrowResult> => {
      if (borrowing.loading) {
        const errorMessage = "Another borrow operation is already in progress";
        setState({ loading: false, error: errorMessage });
        return {
          success: false,
          error: errorMessage,
        };
      }

      setState({ loading: true, error: null });

      try {
        const signer = await getEvmSigner();
        const userAddress = await signer.getAddress();

        const borrowConfig = {
          market: args.market,
          amount: args.useNative
            ? {
                native: args.amount,
              }
            : {
                erc20: {
                  currency: args.currency,
                  value: args.amount,
                },
              },
          sender: evmAddress(userAddress),
          chainId: args.chainId,
          ...(args.onBehalfOf && { onBehalfOf: args.onBehalfOf }),
        };

        const planResult = await borrow(borrowConfig);

        if (planResult.isErr()) {
          throw planResult.error;
        }

        const plan = planResult.value;
        let transactionHash: string;

        switch (plan.__typename) {
          case "TransactionRequest":
            transactionHash = await sendTransaction(plan);
            break;

          default:
            throw new Error(
              `Execution plan type not supported: ${plan.__typename}`,
            );
        }

        const finalResult: BorrowResult = {
          success: true,
          transactionHash,
        };

        setState({ loading: false, error: null });
        return finalResult;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Borrow operation failed";
        console.error("Borrow failed:", error);

        setState({ loading: false, error: errorMessage });
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [borrow, sendTransaction, getEvmSigner, borrowing.loading],
  );

  return {
    executeBorrow,
    loading: state.loading || borrowing.loading,
    error: state.error || borrowing.error,
  };
};

/**
 * Hook for executing Aave repay operations
 * Handles repaying borrowed assets
 */
export const useAaveRepay = () => {
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const [repay, repaying] = useRepay();
  const [state, setState] = useState<RepayState>({
    loading: false,
    error: null,
  });

  const sendTransaction = useCallback(
    async (transactionRequest: {
      to: string;
      data: string;
      value?: string | number;
      gas?: string | number;
      gasPrice?: string | number;
      maxFeePerGas?: string | number;
      maxPriorityFeePerGas?: string | number;
    }) => {
      const signer = await getEvmSigner();

      const tx = {
        to: transactionRequest.to,
        data: transactionRequest.data,
        value: transactionRequest.value || 0,
        gasLimit: transactionRequest.gas,
        gasPrice: transactionRequest.gasPrice,
        maxFeePerGas: transactionRequest.maxFeePerGas,
        maxPriorityFeePerGas: transactionRequest.maxPriorityFeePerGas,
      };

      const response = await signer.sendTransaction(tx);
      await response.wait();
      return response.hash;
    },
    [getEvmSigner],
  );

  /**
   * Execute a repay operation
   */
  const executeRepay = useCallback(
    async (args: RepayArgs): Promise<RepayResult> => {
      if (repaying.loading) {
        const errorMessage = "Another repay operation is already in progress";
        setState({ loading: false, error: errorMessage });
        return {
          success: false,
          error: errorMessage,
        };
      }

      setState({ loading: true, error: null });

      try {
        const signer = await getEvmSigner();
        const userAddress = await signer.getAddress();

        const repayConfig = {
          market: args.market,
          amount: args.useNative
            ? {
                native: args.amount, // Native amounts are passed directly, max logic handled at higher level
              }
            : {
                erc20: {
                  currency: args.currency,
                  value: args.max
                    ? ({ max: true } as const)
                    : ({ exact: args.amount } as const),
                  permitSig: args.permitSig
                    ? {
                        deadline: Number(args.permitSig.deadline),
                        value: args.permitSig.signature,
                      }
                    : undefined,
                },
              },
          sender: evmAddress(userAddress),
          chainId: args.chainId,
          ...(args.onBehalfOf && { onBehalfOf: args.onBehalfOf }),
        };

        const planResult = await repay(repayConfig);

        if (planResult.isErr()) {
          throw planResult.error;
        }

        const plan = planResult.value;
        let transactionHash: string;

        switch (plan.__typename) {
          case "TransactionRequest":
            transactionHash = await sendTransaction(plan);
            break;

          case "ApprovalRequired":
            const approvalHash = await sendTransaction(plan.approval);
            console.log("Approval transaction:", approvalHash);

            transactionHash = await sendTransaction(plan.originalTransaction);
            break;

          case "InsufficientBalanceError":
            throw new Error(
              `Insufficient balance: ${plan.required.value} required.`,
            );

          default:
            throw new Error("Unknown execution plan type");
        }

        const finalResult: RepayResult = {
          success: true,
          transactionHash,
        };

        setState({ loading: false, error: null });
        return finalResult;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Repay operation failed";
        console.error("Repay failed:", error);

        setState({ loading: false, error: errorMessage });
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [repay, sendTransaction, getEvmSigner, repaying.loading],
  );

  return {
    executeRepay,
    loading: state.loading || repaying.loading,
    error: state.error || repaying.error,
  };
};

/**
 * Hook for executing Aave withdraw operations
 * Handles withdrawing supplied assets (aTokens)
 */
export const useAaveWithdraw = () => {
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const [withdraw, withdrawing] = useWithdraw();
  const [state, setState] = useState<WithdrawState>({
    loading: false,
    error: null,
  });

  const sendTransaction = useCallback(
    async (transactionRequest: {
      to: string;
      data: string;
      value?: string | number;
      gas?: string | number;
      gasPrice?: string | number;
      maxFeePerGas?: string | number;
      maxPriorityFeePerGas?: string | number;
    }) => {
      const signer = await getEvmSigner();

      const tx = {
        to: transactionRequest.to,
        data: transactionRequest.data,
        value: transactionRequest.value || 0,
        gasLimit: transactionRequest.gas,
        gasPrice: transactionRequest.gasPrice,
        maxFeePerGas: transactionRequest.maxFeePerGas,
        maxPriorityFeePerGas: transactionRequest.maxPriorityFeePerGas,
      };

      const response = await signer.sendTransaction(tx);
      await response.wait();
      return response.hash;
    },
    [getEvmSigner],
  );

  /**
   * Execute a withdraw operation
   */
  const executeWithdraw = useCallback(
    async (args: WithdrawArgs): Promise<WithdrawResult> => {
      if (withdrawing.loading) {
        const errorMessage =
          "Another withdraw operation is already in progress";
        setState({ loading: false, error: errorMessage });
        return {
          success: false,
          error: errorMessage,
        };
      }

      setState({ loading: true, error: null });

      try {
        const signer = await getEvmSigner();
        const userAddress = await signer.getAddress();

        const withdrawConfig = {
          market: args.market,
          amount: args.useNative
            ? {
                native: {
                  value: { exact: args.amount },
                },
              }
            : {
                erc20: {
                  currency: args.currency,
                  value: { exact: args.amount },
                },
              },
          sender: evmAddress(userAddress),
          chainId: args.chainId,
          ...(args.to && { recipient: args.to }),
        };

        const planResult = await withdraw(withdrawConfig);

        if (planResult.isErr()) {
          throw planResult.error;
        }

        const plan = planResult.value;
        let transactionHash: string;

        switch (plan.__typename) {
          case "TransactionRequest":
            transactionHash = await sendTransaction(plan);
            break;

          default:
            throw new Error(
              `Execution plan type not supported: ${plan.__typename}`,
            );
        }

        const finalResult: WithdrawResult = {
          success: true,
          transactionHash,
        };

        setState({ loading: false, error: null });
        return finalResult;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Withdraw operation failed";
        console.error("Withdraw failed:", error);

        setState({ loading: false, error: errorMessage });
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [withdraw, sendTransaction, getEvmSigner, withdrawing.loading],
  );

  return {
    executeWithdraw,
    loading: state.loading || withdrawing.loading,
    error: state.error || withdrawing.error,
  };
};
