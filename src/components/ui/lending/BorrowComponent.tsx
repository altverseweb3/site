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
}) => {
  // Filter allReserves to get borrow assets with wallet balances
  const borrowableReserves = useMemo(() => {
    return allReserves.filter(
      (reserve) =>
        reserve.borrowingEnabled &&
        parseFloat(reserve.formattedAvailableLiquidity || "0") > 0,
    );
  }, [allReserves]);

  // Use userBorrowPositions from props (centralized from parent)
  const localUserBorrowPositions = userBorrowPositions;

  // Calculate available to borrow for each reserve based on user's collateral
  const calculateAvailableToBorrow = (
    reserve: AaveReserveData,
  ): { amount: string; amountUSD: string } => {
    // This is a simplified calculation
    // In reality, you'd need to:
    // 1. Get user's total collateral value and available borrowing power
    // 2. Check reserve liquidity (availableLiquidity)
    // 3. Check borrow caps
    // 4. Apply LTV ratios

    // For now, use the available liquidity as a base
    const reserveLiquidity = parseFloat(
      reserve.formattedAvailableLiquidity || "0",
    );

    // Mock available borrowing based on liquidity (user would need collateral)
    const mockAvailable = Math.min(reserveLiquidity * 0.1, 1000).toFixed(2); // 10% of liquidity, max 1000
    const mockAvailableUSD = (parseFloat(mockAvailable) * 1).toFixed(2);

    return {
      amount: mockAvailable,
      amountUSD: mockAvailableUSD,
    };
  };

  const handleBorrow = (asset: AaveReserveData) => {
    console.log("Borrow asset:", asset);
    // TODO: Implement borrow functionality
  };

  const handleDetails = (asset: AaveReserveData) => {
    console.log("View asset details:", asset);
    // TODO: Implement details modal
  };

  const hasData = borrowableReserves.length > 0;
  const hasBorrowPositions = localUserBorrowPositions.length > 0;
  const showEmptyState = !hasData;

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
              {hasBorrowPositions &&
                localUserBorrowPositions.map((borrowPosition) => {
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

              {!hasBorrowPositions && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    No borrow positions found
                  </div>
                  <div className="text-sm text-gray-500">
                    Borrow assets to see your positions here
                  </div>
                </div>
              )}
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
              {showEmptyState && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    No borrowable assets found
                  </div>
                </div>
              )}

              {hasData &&
                borrowableReserves.map((reserve) => {
                  const borrowData = calculateAvailableToBorrow(reserve);
                  return (
                    <BorrowUnownedCard
                      key={`${reserve.asset.address}-${reserve.asset.chainId}`}
                      currentAsset={reserve}
                      availableToBorrow={borrowData.amount}
                      availableToBorrowUSD={borrowData.amountUSD}
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
                  );
                })}
            </ScrollBoxSupplyBorrowAssets>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default BorrowComponent;
