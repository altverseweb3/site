import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import SupplyOwnedCard from "@/components/ui/lending/SupplyOwnedCard";
import SupplyYourPositionsHeader from "@/components/ui/lending/SupplyYourPositionsHeader";
import SupplyUnownedCard from "@/components/ui/lending/SupplyUnownedCard";
import SupplyAvailablePositionsHeader from "@/components/ui/lending/SupplyAvailablePositionsHeader";
import { ScrollBoxSupplyBorrowAssets } from "@/components/ui/lending/ScrollBoxSupplyBorrowAssets";
import {
  AaveReserveData,
  UserPosition,
  UserBorrowPosition,
} from "@/types/aave";
import PositionsLoadingComponent from "@/components/ui/lending/PositionsLoadingComponent";
import PositionsEmptyStateComponent from "@/components/ui/lending/PositionsEmptyStateComponent";

interface SupplyComponentProps {
  oraclePrices?: Record<string, number>;
  userSupplyPositions?: UserPosition[];
  userBorrowPositions?: UserBorrowPosition[];
  allReserves?: AaveReserveData[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const SupplyComponent: React.FC<SupplyComponentProps> = ({
  oraclePrices = {},
  userSupplyPositions = [],
  userBorrowPositions = [],
  allReserves = [],
  isLoading = false,
  onRefresh,
}) => {
  const handleSupply = (asset: AaveReserveData) => {
    console.log("Supply asset:", asset);
  };

  const handleWithdraw = (asset: AaveReserveData) => {
    console.log("Withdraw asset:", asset);
  };

  const hasData = allReserves.length > 0;
  const hasUserPositions = userSupplyPositions.length > 0;

  return (
    <div className="w-full space-y-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="positions"
          className="border-[1px] border-[#232326] rounded-md  overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <SupplyYourPositionsHeader />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              {isLoading && (
                <PositionsLoadingComponent message="Loading your positions..." />
              )}

              {!isLoading && !hasUserPositions && (
                <PositionsEmptyStateComponent
                  title="No supply positions found"
                  subtitle="Supply assets to see your positions here"
                />
              )}

              {!isLoading &&
                hasUserPositions &&
                userSupplyPositions.map((position, index) => (
                  <SupplyOwnedCard
                    key={`${position.asset.asset.address}-${position.asset.asset.chainId}-${index}`}
                    currentAsset={position.asset}
                    suppliedBalance={position.suppliedBalance}
                    suppliedBalanceUSD={position.suppliedBalanceUSD}
                    isCollateral={position.isCollateral}
                    onWithdraw={handleWithdraw}
                    oraclePrices={oraclePrices}
                    userSupplyPositions={userSupplyPositions}
                    userBorrowPositions={userBorrowPositions}
                  />
                ))}
            </ScrollBoxSupplyBorrowAssets>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="availablePositions"
          className="border-[1px] border-[#232326] rounded-md  overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <SupplyAvailablePositionsHeader text="available positions" />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              {isLoading && (
                <PositionsLoadingComponent message="Loading available positions..." />
              )}

              {!isLoading && !hasData && (
                <PositionsEmptyStateComponent
                  title="No active reserves found"
                  showRefreshButton={true}
                  onRefresh={onRefresh}
                  refreshText="Refresh"
                />
              )}

              {!isLoading &&
                hasData &&
                allReserves.map((reserve) => (
                  <SupplyUnownedCard
                    key={`${reserve.asset.address}-${reserve.asset.chainId}`}
                    currentAsset={reserve}
                    userBalance={reserve.asset.userBalance || "0"}
                    dollarAmount={reserve.asset.userBalanceUsd || "0.00"}
                    onSupply={handleSupply}
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

export default SupplyComponent;
