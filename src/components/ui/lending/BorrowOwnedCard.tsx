import React, { useState } from "react";
import { BlueButton, GrayButton } from "./SupplyButtonComponents";
import { TokenImage } from "@/components/ui/TokenImage";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import type { Token, Chain, MayanChainName } from "@/types/web3";
import { Network, WalletType } from "@/types/web3";
import { UserBorrowPosition } from "@/utils/aave/fetch";
import { formatBalance } from "@/utils/aave/format";
import { chainNames } from "@/config/aave";

interface BorrowOwnedCardProps {
  borrowPosition: UserBorrowPosition;
  healthFactor?: string;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  onRepay?: (position: UserBorrowPosition, amount: string) => Promise<boolean>;
  onDetailsClick?: (position: UserBorrowPosition) => void;
}

const BorrowOwnedCard = ({
  borrowPosition,
  onDetailsClick = () => {},
}: BorrowOwnedCardProps) => {
  const { asset } = borrowPosition;
  const [isRepaying, setIsRepaying] = useState(false);

  // Format the borrow balance and APY
  const formattedDebt = formatBalance(borrowPosition.formattedTotalDebt);
  const borrowAPY = borrowPosition.currentBorrowAPY || "0.00";

  const chainName = chainNames[asset.chainId || 1] || "ethereum";

  // Create Token and Chain objects for TokenImage component
  const token: Token = {
    id: asset.asset,
    name: asset.name,
    ticker: asset.symbol,
    icon: asset.tokenIcon || "unknown.png",
    address: asset.asset,
    decimals: asset.decimals,
    chainId: asset.chainId || 1,
    stringChainId: (asset.chainId || 1).toString(),
  };

  const chain: Chain = {
    id: chainName,
    name: chainName,
    chainName: chainName,
    mayanName: chainName as MayanChainName,
    alchemyNetworkName: Network.ETH_MAINNET,
    nativeGasToken: {
      symbol: "ETH",
      address: "",
      decimals: 18,
    },
    icon: "",
    brandedIcon: "",
    chainTokenSymbol: "ETH",
    currency: "USD",
    backgroundColor: "",
    fontColor: "",
    chainId: asset.chainId || 1,
    decimals: 18,
    l2: false,
    gasDrop: 0,
    walletType: WalletType.REOWN_EVM,
  };

  // Handle repay action
  const handleRepayClick = async () => {
    setIsRepaying(true);
    try {
      // For now, just show the modal - you would typically open a RepayModal here
      // Similar to how WithdrawModal is used in SupplyOwnedCard
      console.log("Repay clicked for:", asset.symbol);
      // You could open a repay modal here or handle the repay directly
    } catch (error) {
      console.error("Error initiating repay:", error);
    } finally {
      setIsRepaying(false);
    }
  };

  // Handle details click
  const handleDetailsClick = () => {
    onDetailsClick(borrowPosition);
  };

  // Determine debt type for display
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
    return "Variable"; // Default
  };

  return (
    <Card className="text-white border border-[#232326] h-[198px] p-0 rounded-[3px] shadow-none">
      <CardHeader className="flex flex-row items-start p-3 pt-3 pb-1 space-y-0">
        <div className="mr-3">
          <TokenImage token={token} chain={chain} size="md" />
        </div>
        <div>
          <CardTitle className="text-sm font-medium leading-none">
            {asset.name}
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs mt-1">
            {asset.symbol}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-2 space-y-2">
        {/* Debt balance row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">debt balance</div>
          <div className="text-right flex flex-col items-end">
            <div className="text-sm">{formattedDebt}</div>
            <div className="text-gray-400 text-xs">
              ${borrowPosition.totalDebtUSD}
            </div>
          </div>
        </div>

        {/* Borrow APY row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">borrow APY</div>
          <div className="text-sm text-red-400">{borrowAPY}%</div>
        </div>

        {/* Debt type row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">debt type</div>
          <div className="text-sm text-gray-300">{debtTypeDisplay()}</div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between p-3 pt-0 gap-2">
        <BlueButton onClick={handleRepayClick} disabled={isRepaying}>
          {isRepaying ? "repaying..." : "repay"}
        </BlueButton>

        <GrayButton onClick={handleDetailsClick}>details</GrayButton>
      </CardFooter>
    </Card>
  );
};

export default BorrowOwnedCard;
