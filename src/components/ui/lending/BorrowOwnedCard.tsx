import React from "react";
import {
  BlueButton,
  GrayButton,
} from "@/components/ui/lending/SupplyButtonComponents";
import { TokenImage } from "@/components/ui/TokenImage";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import type { Chain } from "@/types/web3";
import { UserBorrowPosition, RateMode } from "@/types/aave";
import { formatBalance, calculateUSDValue } from "@/utils/formatters";
import { getChainByChainId } from "@/config/chains";
import RepayModal from "@/components/ui/lending/RepayModal";
import AssetDetailsModal from "@/components/ui/lending/AssetDetailsModal";

interface BorrowOwnedCardProps {
  borrowPosition: UserBorrowPosition;
  healthFactor?: string;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  walletBalance?: string;
  oraclePrices?: Record<string, number>; // Oracle prices for all assets
  onRepay?: (
    position: UserBorrowPosition,
    amount: string,
    rateMode: RateMode,
  ) => Promise<boolean>;
  onDetailsClick?: (position: UserBorrowPosition) => void;
}

const BorrowOwnedCard = ({
  borrowPosition,
  healthFactor = "1.24",
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  walletBalance = "0.00",
  oraclePrices,
  onRepay = async () => true,
}: BorrowOwnedCardProps) => {
  const { asset } = borrowPosition;

  const formattedDebt = formatBalance(borrowPosition.formattedTotalDebt);
  const borrowAPY = borrowPosition.currentBorrowAPY || "0.00";

  // Calculate USD value using current oracle price
  const currentPrice = oraclePrices?.[asset.asset.address.toLowerCase()];
  const calculatedDebtUSD = calculateUSDValue(
    borrowPosition.formattedTotalDebt || "0",
    currentPrice,
    borrowPosition.totalDebtUSD,
  );

  const chain: Chain = getChainByChainId(asset.asset.chainId);

  const handleRepayComplete = async (amount: string, rateMode: RateMode) => {
    try {
      const success = await onRepay(borrowPosition, amount, rateMode);
      return success;
    } catch (error) {
      console.error("Error completing repay:", error);
      return false;
    }
  };

  const debtTypeDisplay = () => {
    const hasVariable = BigInt(borrowPosition.variableDebt) > BigInt(0);
    const hasStable = BigInt(borrowPosition.stableDebt) > BigInt(0);

    if (hasVariable && hasStable) {
      return "Mixed";
    } else if (hasVariable) {
      return "Variable";
    } else if (hasStable) {
      return "Stable";
    }
    return "Variable";
  };

  return (
    <Card className="text-white border border-[#232326] h-[198px] p-0 rounded-[3px] shadow-none">
      <CardHeader className="flex flex-row items-start p-3 pt-3 pb-1 space-y-0">
        <div className="mr-3">
          <TokenImage token={asset.asset} chain={chain} size="md" />
        </div>
        <div>
          <CardTitle className="text-sm font-medium leading-none">
            {asset.asset.name}
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs mt-1">
            {asset.asset.ticker}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-2 space-y-2">
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">debt balance</div>
          <div className="text-right flex flex-col items-end">
            <div className="text-sm">{formattedDebt}</div>
            <div className="text-gray-400 text-xs">${calculatedDebtUSD}</div>
          </div>
        </div>

        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">borrow APY</div>
          <div className="text-sm text-red-400">{borrowAPY}%</div>
        </div>

        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">debt type</div>
          <div className="text-sm text-gray-300">{debtTypeDisplay()}</div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between p-3 pt-0 gap-2">
        <RepayModal
          tokenSymbol={asset.asset.ticker}
          tokenName={asset.asset.name}
          tokenIcon={asset.asset.icon}
          chainId={asset.asset.chainId}
          walletBalance={walletBalance}
          currentDebt={borrowPosition.formattedTotalDebt}
          debtUSD={borrowPosition.totalDebtUSD}
          borrowAPY={borrowPosition.currentBorrowAPY}
          stableDebt={borrowPosition.stableDebt}
          variableDebt={borrowPosition.variableDebt}
          healthFactor={healthFactor}
          tokenPrice={oraclePrices?.[asset.asset.address.toLowerCase()]}
          liquidationThreshold={0.85}
          totalCollateralUSD={totalCollateralUSD}
          totalDebtUSD={totalDebtUSD}
          onRepay={handleRepayComplete}
          tokenAddress={asset.asset.address}
          tokenDecimals={asset.asset.decimals}
        >
          <BlueButton>repay</BlueButton>
        </RepayModal>

        <AssetDetailsModal currentAsset={asset} oraclePrices={oraclePrices}>
          <GrayButton>details</GrayButton>
        </AssetDetailsModal>
      </CardFooter>
    </Card>
  );
};

export default BorrowOwnedCard;
