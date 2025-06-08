"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWalletConnection } from "@/utils/walletMethods";
import { AaveTransactions, SupportedChainId } from "@/utils/aave";
import { toast } from "sonner";

// Transaction state interface
interface TransactionState {
  isLoading: boolean;
  txHash: string | null;
  error: string | null;
}

// Parameter interfaces
interface SupplyParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
}

interface BorrowParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
  interestRateMode: 1 | 2;
}

interface RepayParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
  interestRateMode: 1 | 2;
}

interface WithdrawParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
}

interface CollateralParams {
  tokenAddress: string;
  useAsCollateral: boolean;
  tokenSymbol: string;
}

// ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

// Supply hook
export const useAaveSupply = () => {
  const { evmAccount, evmNetwork, isEvmConnected } = useWalletConnection();
  const [state, setState] = useState<TransactionState>({
    isLoading: false,
    txHash: null,
    error: null,
  });

  const walletAddress = evmAccount?.address;
  const currentChainId = evmNetwork?.chainId
    ? typeof evmNetwork.chainId === "string"
      ? parseInt(evmNetwork.chainId, 10)
      : evmNetwork.chainId
    : undefined;

  const supply = useCallback(
    async (params: SupplyParams) => {
      if (!isEvmConnected || !walletAddress || !currentChainId) {
        const error = "Please connect your wallet";
        toast.error(error);
        return { success: false, error };
      }

      setState({ isLoading: true, txHash: null, error: null });

      try {
        const provider = new ethers.BrowserProvider(
          window.ethereum as ethers.Eip1193Provider,
        );
        const signer = await provider.getSigner();

        const result = await AaveTransactions.supplyAsset({
          ...params,
          userAddress: walletAddress,
          chainId: currentChainId as SupportedChainId,
          signer,
        });

        if (result.success) {
          setState({
            isLoading: false,
            txHash: result.txHash || null,
            error: null,
          });
          toast.success(
            `Successfully supplied ${params.amount} ${params.tokenSymbol}!`,
          );
          return { success: true, txHash: result.txHash };
        } else {
          setState({
            isLoading: false,
            txHash: null,
            error: result.error || "Unknown error",
          });
          toast.error("Supply failed", { description: result.error });
          return { success: false, error: result.error };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setState({ isLoading: false, txHash: null, error: errorMessage });
        toast.error("Supply failed", { description: errorMessage });
        return { success: false, error: errorMessage };
      }
    },
    [isEvmConnected, walletAddress, currentChainId],
  );

  const getWalletBalance = useCallback(
    async (tokenAddress: string, tokenDecimals: number): Promise<string> => {
      if (!isEvmConnected || !walletAddress) return "0";

      try {
        const provider = new ethers.BrowserProvider(
          window.ethereum as ethers.Eip1193Provider,
        );
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ERC20_ABI,
          provider,
        );
        const balance = await tokenContract.balanceOf(walletAddress);
        return ethers.formatUnits(balance, tokenDecimals);
      } catch {
        return "0";
      }
    },
    [isEvmConnected, walletAddress],
  );

  const getMaxSupplyAmount = useCallback(
    async (tokenAddress: string, tokenDecimals: number): Promise<string> => {
      const balance = await getWalletBalance(tokenAddress, tokenDecimals);
      const maxAmount = parseFloat(balance) * 0.99; // Leave 1% for gas
      return Math.max(0, maxAmount).toFixed(6);
    },
    [getWalletBalance],
  );

  const clearState = useCallback(() => {
    setState({ isLoading: false, txHash: null, error: null });
  }, []);

  return {
    supply,
    state,
    clearState,
    getWalletBalance,
    getMaxSupplyAmount,
  };
};

// Borrow hook
export const useAaveBorrow = () => {
  const { evmAccount, evmNetwork, isEvmConnected } = useWalletConnection();
  const [state, setState] = useState<TransactionState>({
    isLoading: false,
    txHash: null,
    error: null,
  });

  const walletAddress = evmAccount?.address;
  const currentChainId = evmNetwork?.chainId
    ? typeof evmNetwork.chainId === "string"
      ? parseInt(evmNetwork.chainId, 10)
      : evmNetwork.chainId
    : undefined;

  const borrow = useCallback(
    async (params: BorrowParams) => {
      if (!isEvmConnected || !walletAddress || !currentChainId) {
        const error = "Please connect your wallet";
        toast.error(error);
        return { success: false, error };
      }

      setState({ isLoading: true, txHash: null, error: null });

      try {
        const provider = new ethers.BrowserProvider(
          window.ethereum as ethers.Eip1193Provider,
        );
        const signer = await provider.getSigner();

        const result = await AaveTransactions.borrowAsset({
          ...params,
          userAddress: walletAddress,
          chainId: currentChainId as SupportedChainId,
          signer,
        });

        if (result.success) {
          setState({
            isLoading: false,
            txHash: result.txHash || null,
            error: null,
          });
          toast.success(
            `Successfully borrowed ${params.amount} ${params.tokenSymbol}!`,
          );
          return { success: true, txHash: result.txHash };
        } else {
          setState({
            isLoading: false,
            txHash: null,
            error: result.error || "Unknown error",
          });
          toast.error("Borrow failed", { description: result.error });
          return { success: false, error: result.error };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setState({ isLoading: false, txHash: null, error: errorMessage });
        toast.error("Borrow failed", { description: errorMessage });
        return { success: false, error: errorMessage };
      }
    },
    [isEvmConnected, walletAddress, currentChainId],
  );

  const clearState = useCallback(() => {
    setState({ isLoading: false, txHash: null, error: null });
  }, []);

  return {
    borrow,
    state,
    clearState,
  };
};

// Repay hook
export const useAaveRepay = () => {
  const { evmAccount, evmNetwork, isEvmConnected } = useWalletConnection();
  const [state, setState] = useState<TransactionState>({
    isLoading: false,
    txHash: null,
    error: null,
  });

  const walletAddress = evmAccount?.address;
  const currentChainId = evmNetwork?.chainId
    ? typeof evmNetwork.chainId === "string"
      ? parseInt(evmNetwork.chainId, 10)
      : evmNetwork.chainId
    : undefined;

  const repay = useCallback(
    async (params: RepayParams) => {
      if (!isEvmConnected || !walletAddress || !currentChainId) {
        const error = "Please connect your wallet";
        toast.error(error);
        return { success: false, error };
      }

      setState({ isLoading: true, txHash: null, error: null });

      try {
        const provider = new ethers.BrowserProvider(
          window.ethereum as ethers.Eip1193Provider,
        );
        const signer = await provider.getSigner();

        const result = await AaveTransactions.repayAsset({
          ...params,
          userAddress: walletAddress,
          chainId: currentChainId as SupportedChainId,
          signer,
        });

        if (result.success) {
          setState({
            isLoading: false,
            txHash: result.txHash || null,
            error: null,
          });
          toast.success(
            `Successfully repaid ${params.amount} ${params.tokenSymbol}!`,
          );
          return { success: true, txHash: result.txHash };
        } else {
          setState({
            isLoading: false,
            txHash: null,
            error: result.error || "Unknown error",
          });
          toast.error("Repay failed", { description: result.error });
          return { success: false, error: result.error };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setState({ isLoading: false, txHash: null, error: errorMessage });
        toast.error("Repay failed", { description: errorMessage });
        return { success: false, error: errorMessage };
      }
    },
    [isEvmConnected, walletAddress, currentChainId],
  );

  const clearState = useCallback(() => {
    setState({ isLoading: false, txHash: null, error: null });
  }, []);

  return {
    repay,
    state,
    clearState,
  };
};

// Withdraw hook
export const useAaveWithdraw = () => {
  const { evmAccount, evmNetwork, isEvmConnected } = useWalletConnection();
  const [state, setState] = useState<TransactionState>({
    isLoading: false,
    txHash: null,
    error: null,
  });

  const walletAddress = evmAccount?.address;
  const currentChainId = evmNetwork?.chainId
    ? typeof evmNetwork.chainId === "string"
      ? parseInt(evmNetwork.chainId, 10)
      : evmNetwork.chainId
    : undefined;

  const withdraw = useCallback(
    async (params: WithdrawParams) => {
      if (!isEvmConnected || !walletAddress || !currentChainId) {
        const error = "Please connect your wallet";
        toast.error(error);
        return { success: false, error };
      }

      setState({ isLoading: true, txHash: null, error: null });

      try {
        const provider = new ethers.BrowserProvider(
          window.ethereum as ethers.Eip1193Provider,
        );
        const signer = await provider.getSigner();

        const result = await AaveTransactions.withdrawAsset({
          ...params,
          userAddress: walletAddress,
          chainId: currentChainId as SupportedChainId,
          signer,
        });

        if (result.success) {
          setState({
            isLoading: false,
            txHash: result.txHash || null,
            error: null,
          });
          toast.success(
            `Successfully withdrew ${params.amount} ${params.tokenSymbol}!`,
          );
          return { success: true, txHash: result.txHash };
        } else {
          setState({
            isLoading: false,
            txHash: null,
            error: result.error || "Unknown error",
          });
          toast.error("Withdrawal failed", { description: result.error });
          return { success: false, error: result.error };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setState({ isLoading: false, txHash: null, error: errorMessage });
        toast.error("Withdrawal failed", { description: errorMessage });
        return { success: false, error: errorMessage };
      }
    },
    [isEvmConnected, walletAddress, currentChainId],
  );

  const clearState = useCallback(() => {
    setState({ isLoading: false, txHash: null, error: null });
  }, []);

  return {
    withdraw,
    state,
    clearState,
  };
};

// Collateral hook
export const useAaveCollateral = () => {
  const { evmAccount, evmNetwork, isEvmConnected } = useWalletConnection();
  const [state, setState] = useState<TransactionState>({
    isLoading: false,
    txHash: null,
    error: null,
  });

  const walletAddress = evmAccount?.address;
  const currentChainId = evmNetwork?.chainId
    ? typeof evmNetwork.chainId === "string"
      ? parseInt(evmNetwork.chainId, 10)
      : evmNetwork.chainId
    : undefined;

  const setCollateral = useCallback(
    async (params: CollateralParams) => {
      if (!isEvmConnected || !walletAddress || !currentChainId) {
        const error = "Please connect your wallet";
        toast.error(error);
        return { success: false, error };
      }

      setState({ isLoading: true, txHash: null, error: null });

      try {
        const provider = new ethers.BrowserProvider(
          window.ethereum as ethers.Eip1193Provider,
        );
        const signer = await provider.getSigner();

        const result = await AaveTransactions.setCollateral({
          ...params,
          userAddress: walletAddress,
          chainId: currentChainId as SupportedChainId,
          signer,
        });

        if (result.success) {
          setState({
            isLoading: false,
            txHash: result.txHash || null,
            error: null,
          });
          const action = params.useAsCollateral ? "enabled" : "disabled";
          toast.success(
            `Successfully ${action} ${params.tokenSymbol} as collateral!`,
          );
          return { success: true, txHash: result.txHash };
        } else {
          setState({
            isLoading: false,
            txHash: null,
            error: result.error || "Unknown error",
          });
          toast.error("Collateral operation failed", {
            description: result.error,
          });
          return { success: false, error: result.error };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setState({ isLoading: false, txHash: null, error: errorMessage });
        toast.error("Collateral operation failed", {
          description: errorMessage,
        });
        return { success: false, error: errorMessage };
      }
    },
    [isEvmConnected, walletAddress, currentChainId],
  );

  const clearState = useCallback(() => {
    setState({ isLoading: false, txHash: null, error: null });
  }, []);

  return {
    setCollateral,
    state,
    clearState,
  };
};

// Swap borrow rate mode hook
export const useAaveBorrowRateSwap = () => {
  const { evmAccount, evmNetwork, isEvmConnected } = useWalletConnection();
  const [state, setState] = useState<TransactionState>({
    isLoading: false,
    txHash: null,
    error: null,
  });

  const walletAddress = evmAccount?.address;
  const currentChainId = evmNetwork?.chainId
    ? typeof evmNetwork.chainId === "string"
      ? parseInt(evmNetwork.chainId, 10)
      : evmNetwork.chainId
    : undefined;

  const swapBorrowRateMode = useCallback(
    async (
      tokenAddress: string,
      currentRateMode: 1 | 2,
      tokenSymbol: string,
    ) => {
      if (!isEvmConnected || !walletAddress || !currentChainId) {
        const error = "Please connect your wallet";
        toast.error(error);
        return { success: false, error };
      }

      setState({ isLoading: true, txHash: null, error: null });

      try {
        const provider = new ethers.BrowserProvider(
          window.ethereum as ethers.Eip1193Provider,
        );
        const signer = await provider.getSigner();

        const result = await AaveTransactions.swapBorrowRateMode({
          tokenAddress,
          currentRateMode,
          userAddress: walletAddress,
          chainId: currentChainId as SupportedChainId,
          signer,
        });

        if (result.success) {
          setState({
            isLoading: false,
            txHash: result.txHash || null,
            error: null,
          });
          const newRateMode = currentRateMode === 1 ? "variable" : "stable";
          toast.success(
            `Successfully swapped ${tokenSymbol} to ${newRateMode} rate!`,
          );
          return { success: true, txHash: result.txHash };
        } else {
          setState({
            isLoading: false,
            txHash: null,
            error: result.error || "Unknown error",
          });
          toast.error("Rate swap failed", { description: result.error });
          return { success: false, error: result.error };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setState({ isLoading: false, txHash: null, error: errorMessage });
        toast.error("Rate swap failed", { description: errorMessage });
        return { success: false, error: errorMessage };
      }
    },
    [isEvmConnected, walletAddress, currentChainId],
  );

  const clearState = useCallback(() => {
    setState({ isLoading: false, txHash: null, error: null });
  }, []);

  return {
    swapBorrowRateMode,
    state,
    clearState,
  };
};

// Combined transactions hook
export const useAaveTransactions = () => {
  const supplyHook = useAaveSupply();
  const borrowHook = useAaveBorrow();
  const repayHook = useAaveRepay();
  const withdrawHook = useAaveWithdraw();
  const collateralHook = useAaveCollateral();
  const rateSwapHook = useAaveBorrowRateSwap();

  return {
    // Supply operations
    supply: supplyHook.supply,
    supplyState: supplyHook.state,
    clearSupplyState: supplyHook.clearState,
    getWalletBalance: supplyHook.getWalletBalance,
    getMaxSupplyAmount: supplyHook.getMaxSupplyAmount,

    // Borrow operations
    borrow: borrowHook.borrow,
    borrowState: borrowHook.state,
    clearBorrowState: borrowHook.clearState,

    // Repay operations
    repay: repayHook.repay,
    repayState: repayHook.state,
    clearRepayState: repayHook.clearState,

    // Withdraw operations
    withdraw: withdrawHook.withdraw,
    withdrawState: withdrawHook.state,
    clearWithdrawState: withdrawHook.clearState,

    // Collateral operations
    setCollateral: collateralHook.setCollateral,
    collateralState: collateralHook.state,
    clearCollateralState: collateralHook.clearState,

    // Rate swap operations
    swapBorrowRateMode: rateSwapHook.swapBorrowRateMode,
    swapState: rateSwapHook.state,
    clearSwapState: rateSwapHook.clearState,

    // Combined loading state
    isLoading:
      supplyHook.state.isLoading ||
      borrowHook.state.isLoading ||
      repayHook.state.isLoading ||
      withdrawHook.state.isLoading ||
      collateralHook.state.isLoading ||
      rateSwapHook.state.isLoading,
  };
};
