import { FC } from "react";
import { PrimaryButton, GrayButton } from "./SupplyButtonComponents";
import { TokenImage } from "@/components/ui/TokenImage";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { AaveReserveData } from "@/utils/aave/fetch";
import { BorrowModal } from "./BorrowModal";
import AssetDetailsModal from "./AssetDetailsModal";
import { getChainByChainId } from "@/config/chains";
import type { Token, Chain } from "@/types/web3";

interface BorrowUnOwnedCardProps {
  asset?: AaveReserveData;
  availableToBorrow?: string; // Amount user can borrow based on collateral
  availableToBorrowUSD?: string; // USD value of borrowable amount
  onBorrow?: (asset: AaveReserveData) => void;
  healthFactor?: string;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
}

const BorrowUnOwnedCard: FC<BorrowUnOwnedCardProps> = ({
  asset,
  availableToBorrow = "0.00",
  availableToBorrowUSD = "0.00",
  onBorrow = () => {},
  healthFactor = "1.24",
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
}) => {
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
    variableBorrowRate: "",
    stableBorrowRate: "",
    variableBorrowAPY: "",
    stableBorrowAPY: "",
    stableBorrowEnabled: false,
    borrowingEnabled: false,
    totalBorrowed: "",
    formattedTotalBorrowed: "",
    availableLiquidity: "",
    formattedAvailableLiquidity: "",
    borrowCap: "",
    formattedBorrowCap: "",
    isFrozen: false,
  };

  const currentAsset = asset || defaultAsset;

  // Get borrow APY (variable rate) from your enhanced data
  const borrowAPY = currentAsset.variableBorrowAPY || "0.00";
  const stableBorrowAPY = currentAsset.stableBorrowAPY || "0.00";

  // Check if borrowing is enabled using your enhanced data
  const borrowingEnabled = currentAsset.borrowingEnabled ?? true;
  const isIsolationMode = currentAsset.isIsolationModeAsset ?? false;
  const isFrozen = currentAsset.isFrozen ?? false;

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
          tokenSymbol={currentAsset.symbol}
          tokenName={currentAsset.name}
          tokenIcon={currentAsset.tokenIcon}
          chainId={currentAsset.chainId}
          availableToBorrow={availableToBorrow}
          availableToBorrowUSD={availableToBorrowUSD}
          variableBorrowAPY={borrowAPY}
          stableBorrowAPY={stableBorrowAPY}
          borrowingEnabled={borrowingEnabled}
          isIsolationMode={isIsolationMode}
          healthFactor={healthFactor}
          tokenPrice={1}
          totalCollateralUSD={totalCollateralUSD}
          totalDebtUSD={totalDebtUSD}
          tokenAddress={currentAsset.asset}
          tokenDecimals={currentAsset.decimals}
          onBorrow={async () => {
            onBorrow(currentAsset);
            return true;
          }}
        >
          <PrimaryButton disabled={!canBorrow}>
            {canBorrow ? "borrow" : "unavailable"}
          </PrimaryButton>
        </BorrowModal>
        <AssetDetailsModal assetData={currentAsset}>
          <GrayButton>details</GrayButton>
        </AssetDetailsModal>
      </CardFooter>
    </Card>
  );
};

export default BorrowUnOwnedCard;
