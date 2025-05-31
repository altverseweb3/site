import React, { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/lending/Accordion";
import SupplyOwnedCard from "./SupplyOwnedCard";
import SupplyYourPositionsHeader from "@/components/ui/lending/SupplyYourPositionsHeader";
import SupplyUnOwnedCard from "./SupplyUnownedCard";
import SupplyAvailablePositionsHeader from "./SupplyAvailablePositionsHeader";
import { ScrollBoxSupplyBorrowAssets } from "./ScrollBoxSupplyBorrowAssets";
import { toast } from "sonner";

// Define specific asset interfaces
interface Asset {
  address: string;
  name?: string;
  symbol: string;
  currentATokenBalance: number | string;
  priceInUSD?: number | string;
  supplyAPY?: {
    aaveMethod?: number | string;
  };
  usageAsCollateralEnabled: boolean;
  canBeCollateral?: boolean;
}

interface MarketMetrics {
  totalLiquidity: number;
  totalBorrows: number;
  totalSupply: number;
  // Add other market metrics properties as needed
}

// Import the Aave data types
interface AaveDataState {
  suppliedAssets: Asset[];
  borrowedAssets: Asset[];
  availableAssets: Asset[];
  accountData: {
    totalCollateralBase: string;
    totalDebtBase: string;
    availableBorrowsBase: string;
    currentLiquidationThreshold: number;
    ltv: number;
    healthFactor: string;
  } | null;
  marketMetrics: MarketMetrics;
  loading: boolean;
  error: string | null;
  lastUpdateTime: Date | null;
  refreshData: (force?: boolean) => Promise<void>;
}

interface SupplyComponentProps {
  aaveData: AaveDataState;
}

const SupplyComponent: React.FC<SupplyComponentProps> = ({ aaveData }) => {
  const { suppliedAssets, availableAssets, loading } = aaveData;

  // Memoize total supplied value to prevent unnecessary recalculations
  const totalSuppliedValue = useMemo(() => {
    return suppliedAssets.reduce((sum, asset) => {
      return sum + Number(asset.currentATokenBalance || 0);
    }, 0);
  }, [suppliedAssets]);

  // Process supplied assets to calculate USD values and format data
  const processedSuppliedAssets = useMemo(() => {
    return suppliedAssets.map((asset) => {
      const balance = Number(asset.currentATokenBalance || 0);
      const priceInUSD = Number(asset.priceInUSD || 0);
      const dollarAmount = balance * priceInUSD;

      return {
        ...asset,
        formattedBalance: balance.toFixed(6),
        formattedDollarAmount: dollarAmount.toFixed(2),
        formattedSupplyAPY: Number(asset.supplyAPY?.aaveMethod || 0).toFixed(2),
      };
    });
  }, [suppliedAssets]);

  // Process available assets
  const processedAvailableAssets = useMemo(() => {
    return availableAssets.map((asset) => {
      return {
        ...asset,
        formattedSupplyAPY: Number(asset.supplyAPY || 0).toFixed(2),
      };
    });
  }, [availableAssets]);

  // Handle supply action
  const handleSupplyAction = async (asset: Asset) => {
    console.log(`Supply ${asset.symbol} - APY: ${asset.supplyAPY}%`);
    toast.info(`Supply ${asset.symbol}`, {
      description: `Current APY: ${Number(asset.supplyAPY || 0).toFixed(2)}% • ${
        asset.canBeCollateral
          ? "Can be used as collateral"
          : "Cannot be used as collateral"
      }`,
    });
    // Note: Actual supply logic would go here
    // After supply transaction, you might want to refresh data
  };

  return (
    <div className="w-full space-y-4">
      {/* Your Positions Accordion */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="positions"
          className="border-[1px] border-[#232326] rounded-md overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <SupplyYourPositionsHeader
              totalSupplied={totalSuppliedValue}
              loading={loading}
              suppliedAssets={suppliedAssets}
            />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              {loading && suppliedAssets.length === 0 ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse bg-gray-800 h-16 rounded mb-2"
                  />
                ))
              ) : processedSuppliedAssets.length > 0 ? (
                processedSuppliedAssets.map((asset) => (
                  <SupplyOwnedCard
                    key={asset.address}
                    title={asset.name}
                    subtitle={asset.symbol}
                    balance={asset.formattedBalance}
                    dollarAmount={asset.formattedDollarAmount}
                    supplyAPY={asset.formattedSupplyAPY}
                    isCollateral={asset.usageAsCollateralEnabled}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="mb-2">No supply positions found</div>
                  <div className="text-sm">
                    Start supplying assets to earn interest
                  </div>
                </div>
              )}
            </ScrollBoxSupplyBorrowAssets>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Available Assets Accordion */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="availablePositions"
          className="border-[1px] border-[#232326] rounded-md overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <SupplyAvailablePositionsHeader
              availableCount={availableAssets.length}
              loading={loading}
            />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              {loading && availableAssets.length === 0 ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse bg-gray-800 h-16 rounded mb-2"
                  />
                ))
              ) : processedAvailableAssets.length > 0 ? (
                processedAvailableAssets.map((asset) => (
                  <SupplyUnOwnedCard
                    key={asset.address}
                    title={asset.name}
                    subtitle={asset.symbol}
                    balance="0.00" // You could fetch user's wallet balance here
                    dollarAmount="0.00"
                    supplyAPY={asset.formattedSupplyAPY}
                    canBeCollateral={asset.canBeCollateral ?? true}
                    onSupply={() => handleSupplyAction(asset)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="mb-2">No available assets found</div>
                  <div className="text-sm">
                    Unable to load available assets from Aave
                  </div>
                </div>
              )}
            </ScrollBoxSupplyBorrowAssets>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default SupplyComponent;
