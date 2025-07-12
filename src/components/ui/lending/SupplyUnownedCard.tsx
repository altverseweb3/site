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
import { formatBalance, formatAPY } from "@/utils/aave/format";
import { SupplyModal } from "./SupplyModal";
import { getChainByChainId } from "@/config/chains";
import type { Token, Chain } from "@/types/web3";

interface SupplyUnOwnedCardProps {
  asset?: AaveReserveData;
  userBalance?: string; // Optional user balance for this asset
  dollarAmount?: string; // Optional USD value of user balance
  onSupply?: (asset: AaveReserveData) => void;
  onDetails?: (asset: AaveReserveData) => void;
}

const SupplyUnOwnedCard: FC<SupplyUnOwnedCardProps> = ({
  asset,
  userBalance = "0",
  dollarAmount = "0.00",
  onSupply = () => { },
  onDetails = () => { },
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

  // Determine collateral status and isolation mode
  const canBeCollateral = currentAsset.canBeCollateral ?? true;
  const isIsolationMode = currentAsset.isIsolationModeAsset ?? false;

  const formattedBalance = formatBalance(userBalance);
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
        <SupplyModal
          tokenSymbol={currentAsset.symbol}
          tokenName={currentAsset.name}
          tokenIcon={currentAsset.tokenIcon}
          chainId={currentAsset.chainId}
          balance={userBalance}
          supplyAPY={supplyAPY}
          collateralizationStatus={canBeCollateral ? "enabled" : "disabled"}
          healthFactor="0"
          tokenPrice={1}
          liquidationThreshold={0.85}
          totalCollateralUSD={0}
          totalDebtUSD={0}
          tokenAddress={currentAsset.asset}
          tokenDecimals={currentAsset.decimals}
          onSupply={async () => {
            onSupply(currentAsset);
            return true;
          }}
        >
          <PrimaryButton>supply</PrimaryButton>
        </SupplyModal>
        <GrayButton onClick={() => onDetails(currentAsset)}>details</GrayButton>
      </CardFooter>
    </Card>
  );
};

export default SupplyUnOwnedCard;
