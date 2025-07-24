import React, { useState } from "react";
import {
  BlueButton,
  PrimaryButton,
  GrayButton,
} from "./SupplyButtonComponents";
import { TokenImage } from "@/components/ui/TokenImage";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import SupplyCollateralSwitch from "@/components/ui/lending/SupplyCollateralSwitch";
import type { Token, Chain } from "@/types/web3";

import { WithdrawModal } from "@/components/ui/lending/WithdrawModal";
import { AaveReserveData } from "@/utils/aave/fetch";
import { formatBalance, formatAPY } from "@/utils/aave/format";
import { getChainByChainId } from "@/config/chains";
import { CollateralModal } from "@/components/ui/lending/SupplyCollateralModal";
import AssetDetailsModal from "./AssetDetailsModal";

interface SupplyOwnedCardProps {
  asset?: AaveReserveData;
  suppliedBalance?: string; // User's supplied balance for this asset
  suppliedBalanceUSD?: string; // USD value of supplied balance
  isCollateral?: boolean;
  healthFactor?: string; // User's current health factor
  totalCollateralUSD?: number; // User's total collateral value
  totalDebtUSD?: number; // User's total debt value
  onSwitch?: (asset: AaveReserveData) => void;
  onWithdraw?: (asset: AaveReserveData) => void;
  onCollateralChange?: (
    asset: AaveReserveData,
    enabled: boolean,
  ) => Promise<boolean>;
  onWithdrawComplete?: (
    asset: AaveReserveData,
    amount: string,
  ) => Promise<boolean>;
}

const SupplyOwnedCard = ({
  asset,
  suppliedBalance = "0",
  suppliedBalanceUSD = "0.00",
  isCollateral = true,
  healthFactor = "1.24",
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  onSwitch = () => {},
  onCollateralChange = async () => true,
  onWithdrawComplete = async () => true,
}: SupplyOwnedCardProps) => {
  const [collateral, setCollateral] = useState(isCollateral);

  // Default asset for demo purposes (fallback)
  const defaultAsset: AaveReserveData = {
    asset: "0x0000000000000000000000000000000000000000",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 18,
    aTokenAddress: "0x0000000000000000000000000000000000000000",
    currentLiquidityRate: "0",
    totalSupply: "0",
    formattedSupply: "0",
    supplyAPY: "2.74",
    canBeCollateral: true,
    variableBorrowRate: "0",
    stableBorrowRate: "0",
    variableBorrowAPY: "0",
    stableBorrowAPY: "0",
    stableBorrowEnabled: false,
    borrowingEnabled: false,
    totalBorrowed: "0",
    formattedTotalBorrowed: "0",
    availableLiquidity: "0",
    formattedAvailableLiquidity: "0",
    borrowCap: "0",
    formattedBorrowCap: "0",
    isActive: true,
    isFrozen: false,
    isIsolationModeAsset: false,
    debtCeiling: 0,
    userBalance: "0",
    userBalanceFormatted: "0.00",
    userBalanceUsd: "0.00",
    tokenIcon: "unknown.png",
    chainId: 1,
  };

  const currentAsset = asset || defaultAsset;

  // Determine collateral status and isolation mode
  const canBeCollateral = currentAsset.canBeCollateral ?? true;
  const isIsolationMode = currentAsset.isIsolationModeAsset ?? false;

  const formattedBalance = formatBalance(suppliedBalance);
  const supplyAPY = currentAsset.supplyAPY
    ? currentAsset.supplyAPY
    : formatAPY(currentAsset.currentLiquidityRate);

  // Create Token and Chain objects for TokenImage component
  const token: Token = {
    id: currentAsset.asset,
    name: currentAsset.name,
    ticker: currentAsset.symbol,
    icon: currentAsset.tokenIcon || "unknown.png",
    address: currentAsset.asset,
    decimals: currentAsset.decimals,
    chainId: currentAsset.chainId || 1,
    stringChainId: (currentAsset.chainId || 1).toString(),
  };

  const chain: Chain = getChainByChainId(currentAsset.chainId || 1);

  // Handle collateral change from modal
  const handleCollateralChange = async (enabled: boolean) => {
    try {
      const success = await onCollateralChange(currentAsset, enabled);
      if (success) {
        setCollateral(enabled);
      }
      return success;
    } catch (error) {
      console.error("Error changing collateral status:", error);
      return false;
    }
  };

  // Handle withdraw completion
  const handleWithdrawComplete = async (amount: string) => {
    try {
      const success = await onWithdrawComplete(currentAsset, amount);
      if (success) {
        // Optionally trigger a refresh of the component data
        console.log(`Successfully withdrew ${amount} ${currentAsset.symbol}`);
      }
      return success;
    } catch (error) {
      console.error("Error completing withdrawal:", error);
      return false;
    }
  };

  // Handle simple toggle for switch component (opens modal)
  const handleToggle = () => {
    // The switch component is now just for display and triggers the modal
  };

  return (
    <Card className="text-white border border-[#232326] h-[198px] p-0 rounded-[3px] shadow-none">
      <CardHeader className="flex flex-row items-start p-3 pt-3 pb-1 space-y-0">
        <div className="mr-3 rounded-full overflow-hidden">
          <TokenImage token={token} chain={chain} size="md" />
        </div>
        <div>
          <CardTitle className="text-sm font-medium leading-none">
            {currentAsset.name}
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs mt-1">
            {currentAsset.symbol}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-2 space-y-2">
        {/* Balance row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">supply balance</div>
          <div className="text-right flex flex-col items-end">
            <div className="text-sm">{formattedBalance}</div>
            <div className="text-gray-400 text-xs">${suppliedBalanceUSD}</div>
          </div>
        </div>

        {/* APY row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">supply APY</div>
          <div className="text-sm text-green-400">{supplyAPY}%</div>
        </div>

        {/* Collateral toggle row - now wrapped in modal */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">used as collateral</div>
          {canBeCollateral ? (
            <CollateralModal
              tokenSymbol={currentAsset.symbol}
              tokenName={currentAsset.name}
              tokenIcon={currentAsset.tokenIcon}
              chainId={currentAsset.chainId}
              suppliedBalance={suppliedBalance}
              suppliedBalanceUSD={suppliedBalanceUSD}
              supplyAPY={supplyAPY}
              isCurrentlyCollateral={collateral}
              isolationModeEnabled={isIsolationMode}
              canBeCollateral={canBeCollateral}
              healthFactor={healthFactor}
              tokenPrice={1} // You might want to pass real price data
              liquidationThreshold={0.85} // You might want to get this from asset data
              totalCollateralUSD={totalCollateralUSD}
              totalDebtUSD={totalDebtUSD}
              onCollateralChange={handleCollateralChange}
              tokenAddress={currentAsset.asset}
              tokenDecimals={currentAsset.decimals}
            >
              <button className="focus:outline-none">
                <SupplyCollateralSwitch
                  isCollateral={collateral}
                  onToggle={handleToggle}
                />
              </button>
            </CollateralModal>
          ) : (
            <SupplyCollateralSwitch isCollateral={false} onToggle={() => {}} />
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between p-3 pt-0 gap-2">
        <PrimaryButton onClick={() => onSwitch(currentAsset)}>
          switch
        </PrimaryButton>

        {/* Wrap withdraw button in WithdrawModal */}
        <WithdrawModal
          tokenSymbol={currentAsset.symbol}
          tokenName={currentAsset.name}
          tokenIcon={currentAsset.tokenIcon}
          chainId={currentAsset.chainId}
          suppliedBalance={suppliedBalance}
          suppliedBalanceUSD={suppliedBalanceUSD}
          supplyAPY={supplyAPY}
          isCollateral={collateral}
          healthFactor={healthFactor}
          tokenPrice={1} // You might want to pass real price data
          liquidationThreshold={0.85} // You might want to get this from asset data
          totalCollateralUSD={totalCollateralUSD}
          totalDebtUSD={totalDebtUSD}
          onWithdraw={handleWithdrawComplete}
          tokenAddress={currentAsset.asset}
          tokenDecimals={currentAsset.decimals}
          aTokenAddress={currentAsset.aTokenAddress}
        >
          <BlueButton>withdraw</BlueButton>
        </WithdrawModal>

        <AssetDetailsModal assetData={currentAsset}>
          <GrayButton>details</GrayButton>
        </AssetDetailsModal>
      </CardFooter>
    </Card>
  );
};

export default SupplyOwnedCard;
