import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/lending/Accordion";
import SupplyYourPositionsHeader from "@/components/ui/lending/SupplyYourPositionsHeader";
import SupplyUnOwnedCard from "./SupplyUnownedCard";
import SupplyOwnedCard from "./SupplyOwnedCard";
import SupplyAvailablePositionsHeader from "./SupplyAvailablePositionsHeader";
import { ScrollBoxSupplyBorrowAssets } from "./ScrollBoxSupplyBorrowAssets";
import { useAaveAvailableAssets } from "./AaveDataHooks";
import { useAaveTransactions } from "./AaveTransactionHooks";
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
  balance?: string;
  isActive?: boolean;
  isFrozen?: boolean;
  usageAsCollateralEnabled?: boolean;
  totalSupplied?: string;
  userBalance?: string;
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

interface SupplyParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
}

interface SupplyComponentProps {
  aaveData: {
    suppliedAssets: AssetData[];
    borrowedAssets: AssetData[];
    availableAssets: AssetData[];
    accountData: AccountData | null;
    marketMetrics: MarketMetrics | null;
    loading: boolean;
    error: string | null;
    refreshData: () => void;
    supplyAsset: (
      params: SupplyParams,
    ) => Promise<{ success: boolean; txHash?: string; error?: string }>;
    getWalletBalance: (
      tokenAddress: string,
      decimals: number,
      symbol: string,
    ) => Promise<string>;
  };
}

const SupplyComponent: React.FC<SupplyComponentProps> = ({ aaveData }) => {
  const {
    suppliedAssets,
    loading: aaveDataLoading,
    error: aaveDataError,
    refreshData,
  } = aaveData;

  // Use the new simplified hooks
  const {
    assets: availableAssets,
    loading: assetsLoading,
    error: assetsError,
  } = useAaveAvailableAssets();
  const { getWalletBalance } = useAaveTransactions();

  // Combine loading states
  const loading = aaveDataLoading || assetsLoading;
  const error = aaveDataError || assetsError;

  // State to track wallet balances for available assets
  const [walletBalances, setWalletBalances] = React.useState<
    Record<string, string>
  >({});

  // Fetch wallet balances for available assets
  React.useEffect(() => {
    const fetchWalletBalances = async () => {
      if (!availableAssets || !getWalletBalance || loading) return;

      const balances: Record<string, string> = {};

      for (const asset of availableAssets.slice(0, 10)) {
        try {
          const balance = await getWalletBalance(
            asset.address,
            asset.decimals || 18,
          );
          balances[asset.address] = balance;
        } catch {
          balances[asset.address] = "0";
        }
      }

      setWalletBalances(balances);
    };

    const timeoutId = setTimeout(fetchWalletBalances, 1000);
    return () => clearTimeout(timeoutId);
  }, [availableAssets, getWalletBalance, loading]);

  const handleSupplyAction = async (reserve: AssetData) => {
    toast.info(`Supply ${reserve.symbol}`, {
      description: `APY: ${typeof reserve.supplyAPY === "number" ? reserve.supplyAPY.toFixed(2) : "N/A"}% • ${reserve.canBeCollateral ? "Can be collateral" : "Cannot be collateral"}`,
    });
  };

  const handleWithdrawAction = async (asset: AssetData) => {
    toast.info(`Withdraw ${asset.symbol}`, {
      description: `Current balance: ${asset.formattedBalance || asset.currentATokenBalance || "N/A"}`,
    });
    refreshData();
  };

  const handleToggleCollateralAction = async (
    asset: AssetData,
    enable: boolean,
  ) => {
    toast.info(`${enable ? "Enable" : "Disable"} ${asset.symbol} Collateral`, {
      description: `This will ${enable ? "increase" : "decrease"} your borrowing power`,
    });
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
            onClick={refreshData}
            className="mt-2 px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalSuppliedUSD =
    suppliedAssets?.reduce((sum, asset) => {
      return (
        sum +
        (asset.balanceUSD ||
          (Number(asset.currentATokenBalance) || 0) * asset.priceUSD ||
          0)
      );
    }, 0) || 0;

  return (
    <div className="w-full space-y-4">
      <div className="text-xs text-gray-500 p-2 bg-gray-800 rounded">
        Available Assets: {availableAssets?.length || 0} | Supplied Assets:{" "}
        {suppliedAssets?.length || 0} | Loading: {loading ? "Yes" : "No"} |
        Wallet Balances: {Object.keys(walletBalances).length}
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="positions"
          className="border-[1px] border-[#232326] rounded-md overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <SupplyYourPositionsHeader
              totalSupplied={totalSuppliedUSD}
              loading={loading}
              suppliedAssets={
                suppliedAssets?.map((asset) => ({
                  address: asset.address,
                  symbol: asset.symbol,
                  currentATokenBalance: asset.currentATokenBalance || "0",
                  supplyAPY: {
                    aaveMethod: asset.supplyAPY,
                  },
                  usageAsCollateralEnabled:
                    asset.usageAsCollateralEnabled || false,
                })) || []
              }
            />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              {suppliedAssets && suppliedAssets.length > 0 ? (
                suppliedAssets.map((asset, index) => (
                  <SupplyOwnedCard
                    key={asset.address || index}
                    title={asset.name || asset.symbol}
                    subtitle={asset.symbol}
                    suppliedBalance={
                      asset.formattedBalance ||
                      asset.currentATokenBalance?.toString() ||
                      "0"
                    }
                    dollarAmount={(
                      asset.balanceUSD ||
                      (Number(asset.currentATokenBalance) || 0) *
                        asset.priceUSD ||
                      0
                    ).toString()}
                    supplyAPY={
                      typeof asset.supplyAPY === "number"
                        ? asset.supplyAPY.toFixed(2)
                        : typeof asset.supplyAPY === "string"
                          ? asset.supplyAPY
                          : "0.00"
                    }
                    canBeCollateral={asset.canBeCollateral || false}
                    isUsedAsCollateral={asset.usageAsCollateralEnabled || false}
                    tokenPrice={asset.oraclePrice || asset.priceUSD || 1}
                    liquidationThreshold={asset.liquidationThreshold || 0}
                    totalCollateralUSD={
                      aaveData.accountData?.totalCollateralUSD || 0
                    }
                    totalDebtUSD={aaveData.accountData?.totalDebtUSD || 0}
                    healthFactor={
                      aaveData.accountData?.healthFactor?.toString() || "∞"
                    }
                    tokenAddress={asset.address}
                    decimals={asset.decimals || 18}
                    availableSuppliedAssets={(availableAssets || []).map(
                      (availableAsset) => ({
                        address: availableAsset.address,
                        symbol: availableAsset.symbol,
                        name: availableAsset.name || availableAsset.symbol,
                        decimals: availableAsset.decimals || 18,
                        balance: "0",
                        liquidationThreshold:
                          availableAsset.liquidationThreshold,
                        isUsedAsCollateral: false,
                      }),
                    )}
                    onWithdraw={() => handleWithdrawAction(asset)}
                    onToggleCollateral={(enable: boolean) =>
                      handleToggleCollateralAction(asset, enable)
                    }
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

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="availablePositions"
          className="border-[1px] border-[#232326] rounded-md overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <SupplyAvailablePositionsHeader
              loading={loading}
              availableAssets={
                availableAssets?.map((asset) => ({
                  address: asset.address,
                  symbol: asset.symbol,
                  name: asset.name || asset.symbol,
                  decimals: asset.decimals || 18,
                  totalSupplied: asset.totalSupplied,
                  supplyAPY: asset.supplyAPY,
                  priceUSD: asset.priceUSD,
                  oraclePrice: asset.priceUSD,
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
              ) : availableAssets && availableAssets.length > 0 ? (
                availableAssets.map((reserve, index) => {
                  const fetchedBalance = walletBalances[reserve.address];
                  const displayBalance = fetchedBalance || "0";
                  const tokenPrice = reserve.priceUSD || 1;
                  const dollarValue = (
                    parseFloat(displayBalance) * tokenPrice
                  ).toFixed(2);

                  return (
                    <SupplyUnOwnedCard
                      key={reserve.address || index}
                      title={reserve.name || reserve.symbol}
                      subtitle={reserve.symbol}
                      balance={displayBalance}
                      dollarAmount={dollarValue}
                      supplyAPY={reserve.supplyAPY.toFixed(2)}
                      canBeCollateral={reserve.canBeCollateral}
                      tokenPrice={tokenPrice}
                      liquidationThreshold={reserve.liquidationThreshold}
                      userBalance={displayBalance}
                      healthFactor={
                        aaveData.accountData?.healthFactor?.toString() || "∞"
                      }
                      tokenAddress={reserve.address}
                      decimals={reserve.decimals}
                      onSupply={() =>
                        handleSupplyAction({
                          ...reserve,
                          priceUSD: tokenPrice,
                        })
                      }
                    />
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="mb-2">
                    {availableAssets?.length
                      ? "No assets available for supply"
                      : "No available assets found"}
                  </div>
                  <div className="text-sm">
                    {loading ? "Loading..." : "Unable to load Aave reserves"}
                  </div>
                  <button
                    onClick={refreshData}
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

export default SupplyComponent;
