import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/lending/Accordion";
import BorrowYourBorrowsHeader from "./BorrowYourBorrowsHeader";
import BorrowAvailablePositionsHeader from "./BorrowAvailablePositionsHeader";
import BorrowUnOwnedCard from "./BorrowUnownedCard";
import BorrowOwnedCard from "./BorrowOwnedCard";
import { ScrollBoxSupplyBorrowAssets } from "./ScrollBoxSupplyBorrowAssets";
import { toast } from "sonner";

interface AssetData {
  symbol: string;
  address: string;
  name?: string;
  decimals?: number;
  borrowAPY?: number;
  variableBorrowAPY?: number;
  availableLiquidity?: string;
  debtUSD?: number;
  balanceUSD?: number;
  supplyAPY?: number;
  canBeCollateral?: boolean;
  liquidationThreshold?: number;
  isUsedAsCollateral?: boolean;
  currentATokenBalance?: string;
  totalDebt?: number;
  currentStableDebt?: string;
  currentVariableDebt?: string;
  formattedBalance?: string;
  priceUSD: number;
  oraclePrice?: number;
  borrowEnabled?: boolean;
  borrowingEnabled?: boolean;
  isActive?: boolean;
  isFrozen?: boolean;
  balance?: string;
}

interface AccountData {
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  availableBorrowsBase?: string;
  healthFactor?: string;
  ltv?: number;
  currentLiquidationThreshold?: number;
}

interface MarketMetrics {
  totalMarketSize?: number;
  totalAvailable?: number;
  totalBorrows?: number;
  averageSupplyAPY?: number;
  averageBorrowAPY?: number;
}

interface BorrowParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
  interestRateMode: 1 | 2;
}

interface RepayParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
  interestRateMode: 1 | 2;
}

interface BorrowComponentProps {
  aaveData: {
    suppliedAssets: AssetData[];
    borrowedAssets: AssetData[];
    availableAssets: AssetData[];
    accountData: AccountData | null;
    marketMetrics: MarketMetrics | null;
    loading: boolean;
    error: string | null;
    refreshData: () => void;
    borrowAsset: (
      params: BorrowParams,
    ) => Promise<{ success: boolean; txHash?: string; error?: string }>;
    repayAsset: (
      params: RepayParams,
    ) => Promise<{ success: boolean; txHash?: string; error?: string }>;
    getWalletBalance: (
      tokenAddress: string,
      decimals: number,
      symbol: string,
    ) => Promise<string>;
  };
}

const BorrowComponent: React.FC<BorrowComponentProps> = ({ aaveData }) => {
  const {
    availableAssets,
    borrowedAssets,
    loading,
    error,
    accountData,
    refreshData,
  } = aaveData;

  // Filter available assets for borrow operations
  const filteredAvailableAssets =
    availableAssets?.filter((asset) => {
      // Only show active, non-frozen assets that have borrowing enabled
      return (
        asset.isActive &&
        !asset.isFrozen &&
        asset.borrowingEnabled !== false &&
        asset.borrowEnabled !== false
      );
    }) || [];

  const handleBorrowAction = async (reserve: AssetData) => {
    const borrowAPY =
      typeof reserve.borrowAPY === "number"
        ? reserve.borrowAPY.toFixed(2)
        : typeof reserve.variableBorrowAPY === "number"
          ? reserve.variableBorrowAPY.toFixed(2)
          : "N/A";
    toast.info(`Borrow ${reserve.symbol}`, {
      description: `APY: ${borrowAPY}% • Available: ${reserve.availableLiquidity || "N/A"}`,
    });
  };

  const handleRepayAction = async (asset: AssetData) => {
    toast.info(`Repay ${asset.symbol}`, {
      description: `Current debt: ${asset.formattedBalance || asset.currentStableDebt?.toString() || "N/A"}`,
    });
    // Refresh data after repay
    refreshData();
  };

  if (error) {
    return (
      <div className="w-full space-y-4">
        <div className="bg-red-900 border border-red-700 rounded p-4">
          <h3 className="text-red-300 font-semibold mb-2">
            Error Loading Aave Data
          </h3>
          <p className="text-red-200 text-sm">{error}</p>
          <button
            onClick={() => aaveData.refreshData()}
            className="mt-2 px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalBorrowedUSD =
    borrowedAssets?.reduce((sum, asset) => {
      return (
        sum +
        (asset.balanceUSD ||
          (Number(asset.currentStableDebt) || 0) * asset.priceUSD ||
          0)
      );
    }, 0) || 0;

  return (
    <div className="w-full space-y-4">
      <div className="text-xs text-gray-500 p-2 bg-gray-800 rounded">
        Available Assets: {availableAssets?.length || 0} (Borrowable:{" "}
        {filteredAvailableAssets.length}) | Borrowed Assets:{" "}
        {borrowedAssets?.length || 0} | Loading: {loading ? "Yes" : "No"} |
        Filtered Out:{" "}
        {availableAssets?.filter(
          (a) => !a.isActive || a.isFrozen || a.borrowingEnabled === false,
        ).length || 0}
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="borrows"
          className="border-[1px] border-[#232326] rounded-md overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <BorrowYourBorrowsHeader
              totalBorrowed={totalBorrowedUSD}
              loading={loading}
              borrowedAssets={borrowedAssets || []}
            />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              {borrowedAssets && borrowedAssets.length > 0 ? (
                borrowedAssets.map((asset, index) => (
                  <BorrowOwnedCard
                    key={asset.address || index}
                    title={asset.name || asset.symbol}
                    subtitle={asset.symbol}
                    borrowedBalance={
                      asset.formattedBalance ||
                      asset.currentStableDebt?.toString() ||
                      "0"
                    }
                    dollarAmount={(
                      asset.balanceUSD ||
                      (Number(asset.currentStableDebt) || 0) * asset.priceUSD ||
                      0
                    ).toString()}
                    borrowAPY={
                      typeof asset.borrowAPY === "number"
                        ? asset.borrowAPY.toFixed(2)
                        : typeof asset.variableBorrowAPY === "number"
                          ? asset.variableBorrowAPY.toFixed(2)
                          : "0.00"
                    }
                    tokenPrice={asset.oraclePrice || asset.priceUSD || 1}
                    totalCollateralUSD={accountData?.totalCollateralUSD || 0}
                    totalDebtUSD={accountData?.totalDebtUSD || 0}
                    healthFactor={accountData?.healthFactor?.toString() || "∞"}
                    tokenAddress={asset.address}
                    decimals={asset.decimals || 18}
                    availableBorrowedAssets={(availableAssets || []).map(
                      (asset) => ({
                        address: asset.address,
                        symbol: asset.symbol,
                        name: asset.name || asset.symbol,
                        decimals: asset.decimals || 18,
                        balance: asset.balance,
                      }),
                    )}
                    onRepay={() => handleRepayAction(asset)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="mb-2">No borrow positions found</div>
                  <div className="text-sm">
                    Start borrowing assets from available positions below
                  </div>
                </div>
              )}
            </ScrollBoxSupplyBorrowAssets>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="availableBorrows"
          className="border-[1px] border-[#232326] rounded-md overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <BorrowAvailablePositionsHeader
              loading={loading}
              availableAssets={
                filteredAvailableAssets?.map((asset) => ({
                  address: asset.address,
                  symbol: asset.symbol,
                  name: asset.name || asset.symbol,
                  decimals: asset.decimals || 18,
                  totalBorrowed: asset.availableLiquidity,
                  variableBorrowAPY: asset.variableBorrowAPY,
                  borrowAPY: asset.borrowAPY,
                  priceUSD: asset.priceUSD,
                  oraclePrice: asset.oraclePrice,
                })) || []
              }
            />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse bg-gray-800 h-16 rounded mb-2"
                  />
                ))
              ) : filteredAvailableAssets &&
                filteredAvailableAssets.length > 0 ? (
                filteredAvailableAssets.map((reserve, index) => {
                  // Get the correct borrow APY
                  const borrowAPY =
                    typeof reserve.borrowAPY === "number"
                      ? reserve.borrowAPY.toFixed(2)
                      : typeof reserve.variableBorrowAPY === "number"
                        ? reserve.variableBorrowAPY.toFixed(2)
                        : "0.00";

                  // Format available liquidity
                  const availableLiquidity = reserve.availableLiquidity
                    ? parseFloat(reserve.availableLiquidity).toFixed(6)
                    : "0.00";

                  // Format available liquidity for display

                  return (
                    <BorrowUnOwnedCard
                      key={reserve.address || index}
                      title={reserve.name || reserve.symbol}
                      subtitle={reserve.symbol}
                      balance="0.00"
                      dollarAmount="0.00"
                      borrowAPY={borrowAPY}
                      availableToBorrow={availableLiquidity}
                      tokenPrice={reserve.oraclePrice || reserve.priceUSD || 1}
                      liquidationThreshold={reserve.liquidationThreshold || 0}
                      totalCollateralUSD={accountData?.totalCollateralUSD || 0}
                      totalDebtUSD={accountData?.totalDebtUSD || 0}
                      healthFactor={
                        accountData?.healthFactor?.toString() || "∞"
                      }
                      tokenAddress={reserve.address}
                      decimals={reserve.decimals || 18}
                      onBorrow={() => handleBorrowAction(reserve)}
                    />
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="mb-2">
                    {availableAssets?.length
                      ? "No active assets available for borrowing"
                      : "No borrowable assets found"}
                  </div>
                  <div className="text-sm">
                    {loading
                      ? "Loading..."
                      : availableAssets?.length
                        ? `${availableAssets.filter((a) => !a.isActive || a.isFrozen || a.borrowingEnabled === false).length} assets are frozen, inactive, or not borrowable`
                        : "Unable to load Aave reserves"}
                  </div>
                  <button
                    onClick={() => aaveData.refreshData()}
                    className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </ScrollBoxSupplyBorrowAssets>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white">Loading Aave reserves...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowComponent;
