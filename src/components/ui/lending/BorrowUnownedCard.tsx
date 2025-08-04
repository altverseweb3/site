import { FC } from "react";
import {
  PrimaryButton,
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
import { AaveReserveData } from "@/types/aave";
import { BorrowModal } from "@/components/ui/lending/BorrowModal";
import { getChainByChainId } from "@/config/chains";
import AssetDetailsModal from "@/components/ui/lending/AssetDetailsModal";
import type { Chain } from "@/types/web3";

interface BorrowUnownedCardProps {
  currentAsset: AaveReserveData;
  availableToBorrow?: string; // Amount user can borrow based on collateral
  availableToBorrowUSD?: string; // USD value of borrowable amount
  oraclePrices?: Record<string, number>; // Oracle prices for all assets
  onBorrow?: (asset: AaveReserveData) => void;
  onDetails?: (asset: AaveReserveData) => void;
  healthFactor?: string;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
}

const BorrowUnownedCard: FC<BorrowUnownedCardProps> = ({
  currentAsset,
  availableToBorrow = "0.00",
  availableToBorrowUSD = "0.00",
  oraclePrices,
  onBorrow = () => {},
  healthFactor = "1.24",
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
}) => {
  // Get borrow APY (variable rate) from your enhanced data
  const borrowAPY = currentAsset.variableBorrowAPY || "0.00";
  const stableBorrowAPY = currentAsset.stableBorrowAPY || "0.00";

  // Check if borrowing is enabled using your enhanced data
  const borrowingEnabled = currentAsset.borrowingEnabled ?? true;
  const isIsolationMode = currentAsset.isIsolationModeAsset ?? false;
  const isFrozen = currentAsset.isFrozen ?? false;

  const chain: Chain = getChainByChainId(currentAsset.asset.chainId);

  // Get borrowing status display
  const getBorrowingStatusDisplay = () => {
    if (!borrowingEnabled || isFrozen) {
      return { text: "Disabled", color: "text-red-500" };
    }
    if (isIsolationMode) {
      return { text: "Isolation Mode", color: "text-yellow-500" };
    }
    if (parseFloat(currentAsset.formattedAvailableLiquidity || "0") === 0) {
      return { text: "No Liquidity", color: "text-orange-500" };
    }
    return { text: "Available", color: "text-green-500" };
  };

  const borrowingStatus = getBorrowingStatusDisplay();

  // Check if user can actually borrow
  const canBorrow = borrowingEnabled && parseFloat(availableToBorrow) > 0;

  return (
    <Card className="text-white border border-[#232326] h-[198px] p-0 rounded-[3px] shadow-none">
      <CardHeader className="flex flex-row items-start p-3 pt-3 pb-1 space-y-0">
        <div className="mr-3 rounded-full overflow-hidden">
          <TokenImage token={currentAsset.asset} chain={chain} size="md" />
        </div>
        <div>
          <CardTitle className="text-sm font-medium leading-none">
            {currentAsset.asset.name}
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs mt-1">
            {currentAsset.asset.ticker}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-2 space-y-2">
        {/* Available to borrow row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">available to borrow</div>
          <div className="text-right flex flex-col items-end">
            <div className="text-sm">{availableToBorrow}</div>
            <div className="text-gray-400 text-xs">${availableToBorrowUSD}</div>
          </div>
        </div>

        {/* Borrow APY row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">variable APY</div>
          <div className="text-sm text-red-400">{borrowAPY}%</div>
        </div>

        {/* Borrowing status row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">borrowing</div>
          <div className={`text-sm ${borrowingStatus.color}`}>
            {borrowingStatus.text}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between p-3 pt-0 gap-2">
        <BorrowModal
          tokenSymbol={currentAsset.asset.ticker}
          tokenName={currentAsset.asset.name}
          tokenIcon={currentAsset.asset.icon}
          chainId={currentAsset.asset.chainId}
          availableToBorrow={availableToBorrow}
          availableToBorrowUSD={availableToBorrowUSD}
          variableBorrowAPY={borrowAPY}
          stableBorrowAPY={stableBorrowAPY}
          borrowingEnabled={borrowingEnabled}
          isIsolationMode={isIsolationMode}
          healthFactor={healthFactor}
          tokenPrice={
            oraclePrices?.[currentAsset.asset.address.toLowerCase()] || 1
          }
          totalCollateralUSD={totalCollateralUSD}
          totalDebtUSD={totalDebtUSD}
          tokenAddress={currentAsset.asset.address}
          tokenDecimals={currentAsset.asset.decimals}
          onBorrow={async () => {
            onBorrow(currentAsset);
            return true;
          }}
        >
          <PrimaryButton disabled={!canBorrow}>
            {canBorrow ? "borrow" : "unavailable"}
          </PrimaryButton>
        </BorrowModal>
        <AssetDetailsModal
          currentAsset={currentAsset}
          oraclePrices={oraclePrices}
        >
          <GrayButton>details</GrayButton>
        </AssetDetailsModal>
      </CardFooter>
    </Card>
  );
};

export default BorrowUnownedCard;
