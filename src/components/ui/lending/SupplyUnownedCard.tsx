import React, { useState } from "react";
import Image from "next/image";
import { PrimaryButton, GrayButton } from "./SupplyButtonComponents";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { AaveReserveData } from "@/utils/aave/fetch";
import { formatBalance, formatAPY } from "@/utils/aave/format";

interface SupplyUnOwnedCardProps {
  asset?: AaveReserveData;
  userBalance?: string; // Optional user balance for this asset
  dollarAmount?: string; // Optional USD value of user balance
  onSupply?: (asset: AaveReserveData) => void;
  onDetails?: (asset: AaveReserveData) => void;
}

const SupplyUnOwnedCard: React.FC<SupplyUnOwnedCardProps> = ({
  asset,
  userBalance = "0",
  dollarAmount = "0.00",
  onSupply = () => {},
  onDetails = () => {},
}) => {
  const [hasImageError, setHasImageError] = useState(false);

  // Default asset for demo purposes
  const defaultAsset: AaveReserveData = {
    asset: "0x0000000000000000000000000000000000000000",
    name: "Sample Token",
    symbol: "SAMP",
    decimals: 18,
    aTokenAddress: "0x0000000000000000000000000000000000000000",
    currentLiquidityRate: "0",
    totalSupply: "0",
    formattedSupply: "0",
    isActive: true,
    supplyAPY: "0.00",
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

  const formattedBalance = formatBalance(userBalance);
  const supplyAPY = currentAsset.supplyAPY
    ? currentAsset.supplyAPY
    : formatAPY(currentAsset.currentLiquidityRate);

  // Get chain names for image path
  const chainNames: Record<number, string> = {
    1: "ethereum",
    137: "polygon",
    42161: "arbitrum",
    10: "optimism",
    43114: "avalanche",
    8453: "base",
    100: "gnosis",
    56: "bsc",
  };

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

  // Determine what to display for collateral status
  const getCollateralIndicator = () => {
    if (isIsolationMode && canBeCollateral) {
      return (
        <div className="text-amber-500 font-bold text-sm">isolation mode</div>
      );
    } else if (canBeCollateral) {
      return <div className="text-amber-500">✓</div>;
    } else {
      return <div className="text-amber-500">✗</div>;
    }
  };

  return (
    <Card className="text-white border border-[#232326] h-[198px] p-0 rounded-[3px] shadow-none">
      <CardHeader className="flex flex-row items-start p-3 pt-3 pb-1 space-y-0">
        {/* Token image or fallback */}
        {imagePath ? (
          <div className="relative w-8 h-8 flex-shrink-0 mr-3 rounded">
            <Image
              src={imagePath}
              alt={currentAsset.name}
              fill
              sizes="32px"
              className="object-contain"
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
          <div className="text-gray-400 text-sm mt-0">wallet balance</div>
          <div className="text-right flex flex-col items-end">
            <div className="text-sm">{formattedBalance}</div>
            <div className="text-gray-400 text-xs">${dollarAmount}</div>
          </div>
        </div>

        {/* APY row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">supply APY</div>
          <div className="text-sm text-green-400">{supplyAPY}%</div>
        </div>

        {/* Collateral indicator row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">can be collateral</div>
          {getCollateralIndicator()}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between p-3 pt-0 gap-2">
        <PrimaryButton onClick={() => onSupply(currentAsset)}>
          supply
        </PrimaryButton>
        <GrayButton onClick={() => onDetails(currentAsset)}>details</GrayButton>
      </CardFooter>
    </Card>
  );
};

export default SupplyUnOwnedCard;
