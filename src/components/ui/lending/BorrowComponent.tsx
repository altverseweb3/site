import React, { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import { ScrollBoxSupplyBorrowAssets } from "@/components/ui/lending/ScrollBoxSupplyBorrowAssets";
import BorrowUnownedCard from "@/components/ui/lending/BorrowUnownedCard";
import BorrowOwnedCard from "@/components/ui/lending/BorrowOwnedCard";
import {
  AaveReserveData,
  UserBorrowPosition,
  UserPosition,
} from "@/types/aave";
import SupplyAvailablePositionsHeader from "@/components/ui/lending/SupplyAvailablePositionsHeader";
import PositionsLoadingComponent from "@/components/ui/lending/PositionsLoadingComponent";
import PositionsEmptyStateComponent from "@/components/ui/lending/PositionsEmptyStateComponent";

interface BorrowComponentProps {
  oraclePrices?: Record<string, number>;
  healthFactor?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  currentLTV?: number;
  liquidationThreshold?: number;
  userSupplyPositions?: UserPosition[];
  userBorrowPositions?: UserBorrowPosition[];
  allReserves?: AaveReserveData[];
  isLoadingPositions?: boolean;
  onRefresh?: () => void;
}

const BorrowComponent: React.FC<BorrowComponentProps> = ({
  oraclePrices = {},
  healthFactor = 1.24,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  currentLTV = 0,
  liquidationThreshold = 85,
  userSupplyPositions = [],
  userBorrowPositions = [],
  allReserves = [],
  isLoadingPositions = false,
  onRefresh,
}) => {
  // Filter allReserves to get borrow assets with wallet balances
  const borrowableReserves = useMemo(() => {
    console.log("BorrowComponent - Total reserves:", allReserves.length);
    console.log("BorrowComponent - Sample reserve:", allReserves[0]);

    const filtered = allReserves.filter(
      (reserve) =>
        reserve.borrowingEnabled &&
        parseFloat(reserve.formattedAvailableLiquidity || "0") > 0,
    );

    console.log("BorrowComponent - Borrowable reserves:", filtered.length);
    return filtered;
  }, [allReserves]);

  const handleBorrow = (asset: AaveReserveData) => {
    console.log("Borrow asset:", asset);
  };

  const handleDetails = (asset: AaveReserveData) => {
    console.log("View asset details:", asset);
  };

  const hasData = borrowableReserves.length > 0;
  const hasBorrowPositions = userBorrowPositions.length > 0;

  return (
    <div className="w-full space-y-4">
      {/* Only show accordion if wallet is connected */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="borrowPositions"
          className="border-[1px] border-[#232326] rounded-md overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <SupplyAvailablePositionsHeader text="your borrows" />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              {isLoadingPositions && (
                <PositionsLoadingComponent message="Loading your positions..." />
              )}

              {!isLoadingPositions && !hasBorrowPositions && (
                <PositionsEmptyStateComponent
                  title="No borrow positions found"
                  subtitle="Borrow assets to see your positions here"
                />
              )}

              {!isLoadingPositions &&
                hasBorrowPositions &&
                userBorrowPositions.map((borrowPosition) => {
                  // Find wallet balance from allReserves
                  const matchingReserve = allReserves.find(
                    (reserve) =>
                      reserve.asset.address.toLowerCase() ===
                      borrowPosition.asset.asset.address.toLowerCase(),
                  );

                  // Create token object with userBalance populated from reserves data
                  const tokenWithBalance = matchingReserve
                    ? {
                        ...borrowPosition.asset.asset,
                        userBalance:
                          matchingReserve.asset.userBalance || "0.00",
                      }
                    : borrowPosition.asset.asset;

                  return (
                    <BorrowOwnedCard
                      key={`${borrowPosition.asset.asset}-${borrowPosition.asset.asset.chainId}`}
                      borrowPosition={borrowPosition}
                      healthFactor={healthFactor.toString()}
                      totalCollateralUSD={totalCollateralUSD}
                      totalDebtUSD={totalDebtUSD}
                      tokenWithBalance={tokenWithBalance}
                      userSupplyPositions={userSupplyPositions}
                      userBorrowPositions={userBorrowPositions}
                      onRepay={async (position, amount) => {
                        console.log(
                          "Repay",
                          amount,
                          "of",
                          position.asset.asset.ticker,
                        );
                        // TODO: Implement repay functionality
                        return true;
                      }}
                      onDetailsClick={(position) => {
                        console.log("Details for", position.asset.asset.ticker);
                        // TODO: Implement details modal
                      }}
                      oraclePrices={oraclePrices}
                    />
                  );
                })}
            </ScrollBoxSupplyBorrowAssets>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="availableToBorrow"
          className="border-[1px] border-[#232326] rounded-md overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <SupplyAvailablePositionsHeader text="assets to borrow" />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              {isLoadingPositions && (
                <PositionsLoadingComponent message="Loading available assets..." />
              )}

              {!isLoadingPositions && !hasData && (
                <PositionsEmptyStateComponent
                  title="No borrowable assets found"
                  showRefreshButton={true}
                  onRefresh={onRefresh}
                  refreshText="Refresh"
                />
              )}

              {!isLoadingPositions &&
                hasData &&
                borrowableReserves.map((reserve) => (
                  <BorrowUnownedCard
                    key={`${reserve.asset.address}-${reserve.asset.chainId}`}
                    currentAsset={reserve}
                    onBorrow={handleBorrow}
                    onDetails={handleDetails}
                    healthFactor={healthFactor.toString()}
                    totalCollateralUSD={totalCollateralUSD}
                    totalDebtUSD={totalDebtUSD}
                    currentLTV={currentLTV}
                    liquidationThreshold={liquidationThreshold}
                    oraclePrices={oraclePrices}
                    userSupplyPositions={userSupplyPositions}
                    userBorrowPositions={userBorrowPositions}
                  />
                ))}
            </ScrollBoxSupplyBorrowAssets>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default BorrowComponent;
