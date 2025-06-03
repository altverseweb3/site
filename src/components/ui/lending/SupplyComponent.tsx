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
  currentATokenBalance?: number | string;
  priceInUSD?: number | string;
  priceUSD?: number | string; // Add this
  supplyAPY?:
    | {
        aaveMethod?: number | string;
      }
    | string
    | number;
  usageAsCollateralEnabled?: boolean; // Make this optional
  canBeCollateral?: boolean;
  totalSupplied?: string;
  totalSupply?: string;
  // Add these missing properties that come from your hook
  balanceUSD?: number;
  formattedBalance?: string;
  formattedBalanceUSD?: string;
  formattedSupplyAPY?: string;
  decimals?: number;
  liquidityRate?: string;
  currentStableDebt?: string;
  currentVariableDebt?: string;
  totalDebt?: number;
  debtUSD?: number;
  borrowAPY?: string;
  variableBorrowAPY?: string;
  stableBorrowAPY?: string;
  canBeBorrowed?: boolean;
  totalSuppliedUSD?: number;
}
interface ProcessedAsset extends Asset {
  formattedBalance: string;
  formattedDollarAmount?: string;
  formattedSupplyAPY: string;
}

interface MarketMetrics {
  totalLiquidity?: number;
  totalBorrows?: number;
  totalSupply?: number;
  totalMarketSize?: number;
  totalAvailable?: number;
  averageSupplyAPY?: number;
  averageBorrowAPY?: number;
}

interface AaveDataState {
  suppliedAssets: Asset[];
  borrowedAssets: Asset[];
  availableAssets: Asset[];
  accountData: {
    totalCollateralBase?: string;
    totalDebtBase?: string;
    availableBorrowsBase?: string;
    currentLiquidationThreshold?: number;
    ltv?: number;
    healthFactor?: string;
    totalSuppliedUSD?: number;
    totalBorrowedUSD?: number;
    netWorthUSD?: number;
  } | null;
  marketMetrics: MarketMetrics | null;
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
  const totalSuppliedValue = useMemo((): number => {
    return suppliedAssets.reduce((sum: number, asset: Asset) => {
      return sum + Number(asset.currentATokenBalance || 0);
    }, 0);
  }, [suppliedAssets]);

  // Process supplied assets to calculate USD values and format data
  const processedSuppliedAssets = useMemo((): ProcessedAsset[] => {
    return suppliedAssets.map((asset: Asset): ProcessedAsset => {
      const balance = Number(asset.currentATokenBalance || 0);
      const priceInUSD = Number(asset.priceInUSD || 0);
      const dollarAmount = balance * priceInUSD;

      // Format APY using the same logic as available assets
      const formatSuppliedAPY = (apy: Asset["supplyAPY"]): string => {
        let apyNum = 0;
        if (typeof apy === "string") {
          apyNum = parseFloat(apy);
        } else if (typeof apy === "number") {
          apyNum = apy;
        } else if (typeof apy === "object" && apy?.aaveMethod) {
          apyNum = parseFloat(String(apy.aaveMethod));
        } else {
          apyNum = Number(apy || 0);
        }
        return apyNum.toFixed(2);
      };

      return {
        ...asset,
        formattedBalance: balance.toFixed(6),
        formattedDollarAmount: dollarAmount.toFixed(2),
        formattedSupplyAPY: formatSuppliedAPY(asset.supplyAPY),
      };
    });
  }, [suppliedAssets]);

  // Process available assets with total supply data
  const processedAvailableAssets = useMemo((): ProcessedAsset[] => {
    // Debug log to see total supply data
    console.log(
      "🔍 Available assets with total supply:",
      availableAssets.map((asset: Asset) => ({
        symbol: asset.symbol,
        totalSupplied: asset.totalSupplied,
        totalSupply: asset.totalSupply,
        canBeCollateral: asset.canBeCollateral,
      })),
    );

    return availableAssets.map((asset: Asset): ProcessedAsset => {
      // Format total supplied with K/M/B notation
      const formatTotalSupplied = (num: string | undefined): string => {
        if (!num || num === "0") return "0";
        const number = Number(num);
        if (number >= 1e9) return (number / 1e9).toFixed(2) + "B";
        if (number >= 1e6) return (number / 1e6).toFixed(2) + "M";
        if (number >= 1e3) return (number / 1e3).toFixed(2) + "K";
        return number.toFixed(2);
      };

      // Format APY with special handling for very small values
      const formatAPY = (apy: Asset["supplyAPY"]): string => {
        // Handle different APY formats that might come from the API
        let apyNum = 0;
        if (typeof apy === "string") {
          apyNum = parseFloat(apy);
        } else if (typeof apy === "number") {
          apyNum = apy;
        } else if (typeof apy === "object" && apy?.aaveMethod) {
          apyNum = parseFloat(String(apy.aaveMethod));
        } else {
          apyNum = Number(apy || 0);
        }

        if (apyNum === 0) return "0.00";
        if (apyNum > 0 && apyNum < 0.01) return "<0.01";
        return apyNum.toFixed(2);
      };

      return {
        ...asset,
        formattedSupplyAPY: formatAPY(asset.supplyAPY),
        formattedBalance: formatTotalSupplied(asset.totalSupplied),
      };
    });
  }, [availableAssets]);

  // Handle supply action
  const handleSupplyAction = async (asset: Asset): Promise<void> => {
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
              suppliedAssets={[]}
            />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              {loading && suppliedAssets.length === 0 ? (
                Array.from({ length: 3 }).map((_, index: number) => (
                  <div
                    key={index}
                    className="animate-pulse bg-gray-800 h-16 rounded mb-2"
                  />
                ))
              ) : processedSuppliedAssets.length > 0 ? (
                processedSuppliedAssets.map((asset: ProcessedAsset) => (
                  <SupplyOwnedCard
                    key={asset.address}
                    title={asset.name}
                    subtitle={asset.symbol}
                    balance={asset.formattedBalance}
                    dollarAmount={asset.formattedDollarAmount || "0.00"}
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
            <SupplyAvailablePositionsHeader />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              {loading && availableAssets.length === 0 ? (
                Array.from({ length: 8 }).map((_, index: number) => (
                  <div
                    key={index}
                    className="animate-pulse bg-gray-800 h-16 rounded mb-2"
                  />
                ))
              ) : processedAvailableAssets.length > 0 ? (
                processedAvailableAssets.map((asset: ProcessedAsset) => (
                  <SupplyUnOwnedCard
                    key={asset.address}
                    title={asset.name}
                    subtitle={asset.symbol}
                    balance={asset.formattedBalance}
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
