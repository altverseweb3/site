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
import { SupplyModal } from "@/components/ui/lending/SupplyModal";
import { formatBalance, formatAPY } from "@/utils/formatters";
import { getChainByChainId } from "@/config/chains";
import AssetDetailsModal from "@/components/ui/lending/AssetDetailsModal";
import type { Chain } from "@/types/web3";

interface SupplyUnownedCardProps {
  currentAsset: AaveReserveData;
  userBalance?: string; // Optional user balance for this asset
  dollarAmount?: string; // Optional USD value of user balance
  onSupply?: (asset: AaveReserveData) => void;
}

const SupplyUnownedCard: FC<SupplyUnownedCardProps> = ({
  currentAsset,
  userBalance = "0",
  dollarAmount = "0.00",
  onSupply = () => {},
}) => {
  // Determine collateral status and isolation mode
  const canBeCollateral = currentAsset.canBeCollateral ?? true;
  const isIsolationMode = currentAsset.isIsolationModeAsset ?? false;

  const formattedBalance = formatBalance(userBalance);
  const supplyAPY = currentAsset.supplyAPY
    ? currentAsset.supplyAPY
    : formatAPY(currentAsset.currentLiquidityRate);

  const chain: Chain = getChainByChainId(currentAsset.asset.chainId || 1);

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
          <TokenImage token={currentAsset.asset} chain={chain} size="md" />
        </div>
        <div>
          <CardTitle className="text-sm font-medium leading-none">
            {currentAsset.asset.name}
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs mt-1">
            {currentAsset.asset.icon}
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
          tokenSymbol={currentAsset.asset.ticker}
          tokenName={currentAsset.asset.name}
          tokenIcon={currentAsset.asset.icon}
          chainId={currentAsset.asset.chainId}
          balance={userBalance}
          supplyAPY={supplyAPY}
          collateralizationStatus={canBeCollateral ? "enabled" : "disabled"}
          healthFactor="0"
          tokenPrice={1}
          liquidationThreshold={0.85}
          totalCollateralUSD={0}
          totalDebtUSD={0}
          tokenAddress={currentAsset.asset.address}
          tokenDecimals={currentAsset.asset.decimals}
          onSupply={async () => {
            onSupply(currentAsset);
            return true;
          }}
        >
          <PrimaryButton>supply</PrimaryButton>
        </SupplyModal>
        <AssetDetailsModal currentAsset={currentAsset}>
          <GrayButton>details</GrayButton>
        </AssetDetailsModal>
      </CardFooter>
    </Card>
  );
};

export default SupplyUnownedCard;
