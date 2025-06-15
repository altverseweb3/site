import React from "react";
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
  // Default asset for demo purposes - using the correct AaveReserveData interface
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
    userBalance: "0",
    userBalanceFormatted: "0.00",
    userBalanceUsd: "0.00",
  };

  const currentAsset = asset || defaultAsset;

  // Use collateral status from asset data or fallback
  const canBeCollateral = currentAsset.canBeCollateral ?? true;

  const formattedBalance = formatBalance(userBalance);
  const supplyAPY = currentAsset.supplyAPY
    ? currentAsset.supplyAPY
    : formatAPY(currentAsset.currentLiquidityRate);

  // Get token symbol for icon (first letter)
  const tokenIcon = currentAsset.symbol.charAt(0).toUpperCase();

  return (
    <Card className="text-white border border-[#232326] h-[198px] p-0 rounded-[3px] shadow-none">
      <CardHeader className="flex flex-row items-start p-3 pt-3 pb-1 space-y-0">
        <div className="bg-blue-500 rounded-full p-2 mr-3 flex-shrink-0">
          <span className="text-white text-sm font-bold">{tokenIcon}</span>
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
          {canBeCollateral ? (
            <div className="text-amber-500">✓</div>
          ) : (
            <div className="text-gray-500">✗</div>
          )}
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
