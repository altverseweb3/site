"use client";

import { useAaveData } from "@/components/ui/lending/AaveDataHooks";
import { useAaveTransactions } from "@/components/ui/lending/AaveTransactionHooks";
import BorrowComponent from "@/components/ui/lending/BorrowComponent";
import PoweredByAave from "@/components/ui/lending/PoweredByAave";
import SupplyBorrowMetricsHeaders from "@/components/ui/lending/SupplyBorrowMetricsHeaders";
import SupplyComponent from "@/components/ui/lending/SupplyComponent";

import React, { useState } from "react";

const BorrowLendComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("borrow");

  // Use the new simplified hooks
  const aaveData = useAaveData();
  const aaveTransactions = useAaveTransactions();

  const formatHealthFactor = (healthFactor: string): string => {
    try {
      const hf = parseFloat(healthFactor);
      if (hf > 100 || hf === 0) {
        return "∞";
      }
      return hf.toFixed(2);
    } catch {
      return "∞";
    }
  };

  // Extract the data in the format your existing components expect
  const componentData = {
    suppliedAssets: (aaveData.suppliedAssets || []).map((asset) => ({
      ...asset,
      supplyAPY:
        typeof asset.supplyAPY === "string"
          ? parseFloat(asset.supplyAPY)
          : asset.supplyAPY,
      variableBorrowAPY:
        typeof asset.variableBorrowAPY === "string"
          ? parseFloat(asset.variableBorrowAPY)
          : asset.variableBorrowAPY,
      formattedBalance: asset.currentATokenBalance,
      balanceUSD: asset.balanceUSD,
      priceUSD: asset.priceUSD,
    })),
    borrowedAssets: (aaveData.borrowedAssets || []).map((asset) => ({
      ...asset,
      supplyAPY:
        typeof asset.supplyAPY === "string"
          ? parseFloat(asset.supplyAPY)
          : asset.supplyAPY,
      variableBorrowAPY:
        typeof asset.variableBorrowAPY === "string"
          ? parseFloat(asset.variableBorrowAPY)
          : asset.variableBorrowAPY,
      formattedBalance: asset.totalDebt.toString(),
      priceUSD: asset.priceUSD,
    })),
    availableAssets: (aaveData.assets || []).map((asset) => ({
      symbol: asset.symbol,
      address: asset.address,
      name: asset.name,
      decimals: asset.decimals,
      supplyAPY: asset.supplyAPY,
      variableBorrowAPY: asset.variableBorrowAPY,
      canBeCollateral: asset.canBeCollateral,
      liquidationThreshold: asset.liquidationThreshold,
      isActive: asset.isActive,
      isFrozen: asset.isFrozen,
      totalSupplied: asset.totalSupplied,
      priceUSD: asset.priceUSD,
    })),
    accountData: aaveData.accountData
      ? {
          ...aaveData.accountData,
          healthFactor: formatHealthFactor(aaveData.accountData.healthFactor),
          totalSuppliedUSD: aaveData.accountData.totalCollateralUSD || 0,
          totalBorrowedUSD: aaveData.accountData.totalDebtUSD || 0,
          netWorthUSD: aaveData.accountData.netWorthUSD || 0,
          totalCollateralUSD: aaveData.accountData.totalCollateralUSD || 0,
          totalDebtUSD: aaveData.accountData.totalDebtUSD || 0,
        }
      : null,
    marketMetrics: aaveData.marketOverview
      ? {
          totalMarketSize: aaveData.marketOverview.totalMarketSizeUSD,
          totalAvailable: aaveData.marketOverview.totalAvailableLiquidityUSD,
          totalBorrows: aaveData.marketOverview.totalBorrowsUSD,
          averageSupplyAPY: aaveData.marketOverview.averageSupplyAPY,
          averageBorrowAPY: aaveData.marketOverview.averageBorrowAPY,
        }
      : null,
    loading: aaveData.loading,
    error: aaveData.error,
    refreshData: aaveData.refetchAll,

    // Add transaction functions
    supplyAsset: aaveTransactions.supply,
    borrowAsset: aaveTransactions.borrow,
    repayAsset: aaveTransactions.repay,
    withdrawAsset: aaveTransactions.withdraw,
    setCollateral: aaveTransactions.setCollateral,

    // Add state management
    supplyState: aaveTransactions.supplyState,
    borrowState: aaveTransactions.borrowState,
    repayState: aaveTransactions.repayState,
    withdrawState: aaveTransactions.withdrawState,
    collateralState: aaveTransactions.collateralState,

    // Add utility functions
    getWalletBalance: aaveTransactions.getWalletBalance,
  };

  // Header data that SupplyBorrowMetricsHeaders expects
  const headerData = {
    accountData: componentData.accountData,
    marketMetrics: componentData.marketMetrics,
    suppliedAssets: componentData.suppliedAssets,
    borrowedAssets: componentData.borrowedAssets,
    loading: componentData.loading,
    error: componentData.error,
  };

  return (
    <div className="flex h-full w-full items-start justify-center sm:pt-[6vh] pt-[2vh] min-h-[500px]">
      <div className="w-full">
        <SupplyBorrowMetricsHeaders
          activeTab={activeTab}
          onTabChange={setActiveTab}
          aaveData={headerData}
        />

        {activeTab === "supply" ? (
          <SupplyComponent aaveData={componentData} />
        ) : (
          <BorrowComponent aaveData={componentData} />
        )}

        <PoweredByAave />
      </div>
    </div>
  );
};

export default BorrowLendComponent;
