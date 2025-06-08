// DEPRECATED: This file is deprecated. Use AaveDataHooks.tsx and AaveTransactionHooks.tsx instead.
// This file is kept for backwards compatibility only.

import { useAaveData, useAaveAvailableAssets } from "./AaveDataHooks";
import { useAaveTransactions } from "./AaveTransactionHooks";

// Re-export the new hooks with old names for backwards compatibility
export const useAaveAvailableReserves = useAaveAvailableAssets;
export const useCompleteAaveOperations = () => {
  const data = useAaveData();
  const transactions = useAaveTransactions();

  return {
    // Data
    reserves: data.assets,
    suppliedAssets: data.suppliedAssets,
    borrowedAssets: data.borrowedAssets,
    userAccountData: data.accountData,
    marketOverview: data.marketOverview,
    loading: data.loading,
    error: data.error,
    loadAllReserves: data.refetchAll,

    // Transactions
    supplyAsset: transactions.supply,
    borrowAsset: transactions.borrow,
    repayAsset: transactions.repay,
    withdrawAsset: transactions.withdraw,
    setCollateral: transactions.setCollateral,
    swapBorrowRateMode: transactions.swapBorrowRateMode,

    // States
    supplyState: transactions.supplyState,
    borrowState: transactions.borrowState,
    repayState: transactions.repayState,
    withdrawState: transactions.withdrawState,
    collateralState: transactions.collateralState,
    swapState: transactions.swapState,

    // Utilities
    getWalletBalance: transactions.getWalletBalance,
    getMaxSupplyAmount: transactions.getMaxSupplyAmount,
    walletBalances: {},
  };
};

// Export other hooks that might be imported
export const useAaveSupply = () => {
  const transactions = useAaveTransactions();
  return {
    supplyAsset: transactions.supply,
    supplyState: transactions.supplyState,
    clearSupplyState: transactions.clearSupplyState,
    getWalletBalance: transactions.getWalletBalance,
    getMaxSupplyAmount: transactions.getMaxSupplyAmount,
    walletBalances: {},
  };
};

export const useAaveBorrow = () => {
  const transactions = useAaveTransactions();
  return {
    borrowAsset: transactions.borrow,
    borrowState: transactions.borrowState,
    clearBorrowState: transactions.clearBorrowState,
    getMaxBorrowAmount: () => Promise.resolve("0"),
  };
};

export const useAaveRepay = () => {
  const transactions = useAaveTransactions();
  return {
    repayAsset: transactions.repay,
    repayState: transactions.repayState,
    clearRepayState: transactions.clearRepayState,
    getUserDebtBalance: () => Promise.resolve("0"),
  };
};

export const useAaveWithdraw = () => {
  const transactions = useAaveTransactions();
  return {
    withdrawAsset: transactions.withdraw,
    withdrawState: transactions.withdrawState,
    clearWithdrawState: transactions.clearWithdrawState,
    getUserATokenBalance: () => Promise.resolve("0"),
  };
};

export const useAaveCollateral = () => {
  const transactions = useAaveTransactions();
  return {
    setCollateral: transactions.setCollateral,
    collateralState: transactions.collateralState,
    clearCollateralState: transactions.clearCollateralState,
    canEnableAsCollateral: () => Promise.resolve(true),
  };
};

export const useAaveBorrowRateSwap = () => {
  const transactions = useAaveTransactions();
  return {
    swapBorrowRateMode: transactions.swapBorrowRateMode,
    swapState: transactions.swapState,
    clearSwapState: transactions.clearSwapState,
  };
};

export const useDetailedReserveData = () => {
  const data = useAaveData();
  return {
    reserves: data.assets,
    selectedReserve: null,
    marketOverview: data.marketOverview,
    loading: data.loading,
    error: data.error,
    loadAllReserves: data.refetchAll,
    loadReserveDetails: () => {},
    setSelectedReserve: () => {},
    getReserveBySymbol: () => undefined,
    getTopReserves: () => [],
  };
};

export const useAaveUserPositions = () => {
  const data = useAaveData();
  return {
    userAccountData: data.accountData,
    suppliedAssets: data.suppliedAssets,
    borrowedAssets: data.borrowedAssets,
    loading: data.positionsLoading,
    error: data.positionsError,
    reloadUserPositions: data.refetchAll,
  };
};
