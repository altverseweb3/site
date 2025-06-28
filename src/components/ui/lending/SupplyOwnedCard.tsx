import React, { useState, FC } from "react";
import Image from "next/image";
import { BlueButton, PrimaryButton } from "./SupplyButtonComponents";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import SupplyCollateralSwitch from "@/components/ui/lending/SupplyCollateralSwitch";
import { AaveReserveData } from "@/utils/aave/fetch";
import { formatBalance, formatAPY } from "@/utils/aave/format";
import { chainNames } from "@/config/aave";
import { CollateralModal } from "./SupplyCollateralModal";

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
}

const SupplyOwnedCard: FC<SupplyOwnedCardProps> = ({
  asset,
  suppliedBalance = "0",
  suppliedBalanceUSD = "0.00",
  isCollateral = true,
  healthFactor = "1.24",
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  onSwitch = () => {},
  onWithdraw = () => {},
  onCollateralChange = async () => true,
}) => {
  const [hasImageError, setHasImageError] = useState(false);
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
    isActive: true,
    supplyAPY: "2.74",
    canBeCollateral: true,
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

  const chainName = chainNames[currentAsset.chainId || 1] || "ethereum";
  const tokenIcon = currentAsset.symbol.charAt(0).toUpperCase();

  // Simple image path logic
  const getImagePath = () => {
    if (
      !currentAsset.tokenIcon ||
      currentAsset.tokenIcon === "unknown.png" ||
      hasImageError
    ) {
      return null;
    }
    return `/tokens/${chainName}/pngs/${currentAsset.tokenIcon}`;
  };

  const imagePath = getImagePath();

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

  // Handle simple toggle for switch component (opens modal)
  const handleToggle = () => {
    // For now, just do nothing - the modal will handle the actual toggle
    // The switch component is now just for display and triggers the modal
  };

  // Determine collateral switch state
  const getCollateralSwitchProps = () => {
    if (isIsolationMode && canBeCollateral) {
      return {
        isCollateral: collateral,
        onToggle: handleToggle,
        disabled: false,
        tooltip: "This asset is in isolation mode",
      };
    } else if (canBeCollateral) {
      return {
        isCollateral: collateral,
        onToggle: handleToggle,
        disabled: false,
      };
    } else {
      return {
        isCollateral: false,
        onToggle: () => {},
        disabled: true,
        tooltip: "This asset cannot be used as collateral",
      };
    }
  };

  const collateralSwitchProps = getCollateralSwitchProps();

  return (
    <Card className="text-white border border-[#232326] h-[198px] p-0 rounded-[3px] shadow-none">
      <CardHeader className="flex flex-row items-start p-3 pt-3 pb-1 space-y-0">
        {/* Token image or fallback */}
        {imagePath ? (
          <div className="relative w-8 h-8 flex-shrink-0 mr-3 rounded-full overflow-hidden">
            <Image
              src={imagePath}
              alt={currentAsset.name}
              fill
              sizes="32px"
              className="object-cover"
              onError={() => setHasImageError(true)}
            />
          </div>
        ) : (
          <div className="bg-blue-500 rounded-full p-2 mr-3 flex-shrink-0 w-8 h-8 flex items-center justify-center">
            <span className="text-white text-sm font-bold">{tokenIcon}</span>
          </div>
        )}
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
                  isCollateral={collateralSwitchProps.isCollateral}
                  onToggle={collateralSwitchProps.onToggle}
                />
              </button>
            </CollateralModal>
          ) : (
            <SupplyCollateralSwitch
              isCollateral={collateralSwitchProps.isCollateral}
              onToggle={collateralSwitchProps.onToggle}
            />
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between p-3 pt-0 gap-2">
        <PrimaryButton onClick={() => onSwitch(currentAsset)}>
          switch
        </PrimaryButton>
        <BlueButton onClick={() => onWithdraw(currentAsset)}>
          withdraw
        </BlueButton>
      </CardFooter>
    </Card>
  );
};

export default SupplyOwnedCard;
