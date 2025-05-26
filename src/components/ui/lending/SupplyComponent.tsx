import React, { useEffect, useState, useCallback } from "react";
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
import { AaveMethods } from "@/utils/aaveMethods";
import { useWalletConnection } from "@/utils/walletMethods";
import { toast } from "sonner";
import { Token, Chain } from "@/types/web3";

interface SuppliedAsset {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  currentATokenBalance: string;
  currentStableDebt: string;
  currentVariableDebt: string;
  liquidityRate: unknown;
  liquidityRateFormatted: string;
  usageAsCollateralEnabled: boolean;
  supplyAPY?: {
    simple: string;
    compounded: string;
    aaveMethod: string;
  } | null;
  token: Token;
  chain: Chain;
}

interface AvailableAsset {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  supplyAPY?: string;
  canBeCollateral?: boolean;
  liquidityRate?: string;
  token: Token;
  chain: Chain;
}

interface AccountData {
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: string;
  usedProvider?: string;
}

// Type for asset data used in token creation
interface AssetData {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

const SupplyComponent: React.FC = () => {
  const { evmAccount, evmNetwork, isEvmConnected } = useWalletConnection();

  const walletAddress = evmAccount?.address;
  const currentChainId = evmNetwork?.chainId
    ? typeof evmNetwork.chainId === "string"
      ? parseInt(evmNetwork.chainId, 10)
      : evmNetwork.chainId
    : undefined;

  const [suppliedAssets, setSuppliedAssets] = useState<SuppliedAsset[]>([]);
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize createTokenFromAsset to prevent unnecessary re-renders
  const createTokenFromAsset = useCallback(
    (asset: AssetData): Token => {
      return {
        id: `${asset.symbol.toLowerCase()}-${currentChainId}`,
        name: asset.name,
        ticker: asset.symbol,
        icon: "unknown.png",
        address: asset.address,
        decimals: asset.decimals,
        chainId: currentChainId!,
        native: asset.symbol.toUpperCase() === "ETH" && currentChainId === 1,
      } as Token;
    },
    [currentChainId],
  );

  // Memoize createCurrentChain to prevent unnecessary re-renders
  const createCurrentChain = useCallback((): Chain => {
    const chainData: Record<number, Partial<Chain>> = {
      1: {
        id: "ethereum",
        name: "Ethereum Mainnet",
        chainName: "Ethereum",
        symbol: "ETH",
        currency: "ETH",
        decimals: 18,
      },
      137: {
        id: "polygon",
        name: "Polygon",
        chainName: "Polygon",
        symbol: "MATIC",
        currency: "MATIC",
        decimals: 18,
      },
      42161: {
        id: "arbitrum",
        name: "Arbitrum",
        chainName: "Arbitrum",
        symbol: "ETH",
        currency: "ETH",
        decimals: 18,
      },
      10: {
        id: "optimism",
        name: "Optimism",
        chainName: "Optimism",
        symbol: "ETH",
        currency: "ETH",
        decimals: 18,
      },
      43114: {
        id: "avalanche",
        name: "Avalanche",
        chainName: "Avalanche",
        symbol: "AVAX",
        currency: "AVAX",
        decimals: 18,
      },
      8453: {
        id: "base",
        name: "Base",
        chainName: "Base",
        symbol: "ETH",
        currency: "ETH",
        decimals: 18,
      },
    };

    const defaultChain = chainData[1];
    const chain = chainData[currentChainId!] || defaultChain;

    return { ...chain, chainId: currentChainId! } as Chain;
  }, [currentChainId]);

  const currentChain = createCurrentChain();

  // Memoize validateAaveRequirements to prevent unnecessary re-renders
  const validateAaveRequirements = useCallback((): {
    isValid: boolean;
    errorMessage?: string;
  } => {
    if (!isEvmConnected) {
      return {
        isValid: false,
        errorMessage:
          "Please connect your EVM wallet (MetaMask, etc.) to use Aave",
      };
    }
    if (!walletAddress) {
      return {
        isValid: false,
        errorMessage:
          "EVM wallet connected but no address found. Please refresh or reconnect MetaMask.",
      };
    }
    if (!currentChainId) {
      return {
        isValid: false,
        errorMessage:
          "Unable to detect EVM network. Please check your MetaMask connection.",
      };
    }
    if (!AaveMethods.isChainSupported(currentChainId)) {
      const networkName = AaveMethods.getNetworkName(currentChainId);
      return {
        isValid: false,
        errorMessage: `Aave V3 is not supported on ${networkName}. Please switch to Ethereum, Polygon, Arbitrum, etc. in MetaMask.`,
      };
    }
    return { isValid: true };
  }, [isEvmConnected, walletAddress, currentChainId]);

  const validation = validateAaveRequirements();

  // Now fetchUserData has all its dependencies properly listed
  const fetchUserData = useCallback(async () => {
    const currentValidation = validateAaveRequirements();

    if (!currentValidation.isValid) {
      setError(currentValidation.errorMessage || "Validation failed");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Your original method - just gets ALL assets now
      const completePosition = await AaveMethods.fetchCompleteUserPosition(
        walletAddress!,
        currentChainId!,
      );

      setAccountData(completePosition.accountData);

      // Supplied assets
      const supplied = completePosition.userPositions
        .filter((position) => Number(position.currentATokenBalance) > 0)
        .map((asset) => ({
          ...asset,
          token: createTokenFromAsset({
            symbol: asset.symbol,
            name: asset.name,
            address: asset.address,
            decimals: asset.decimals,
          }),
          chain: currentChain,
        }));
      setSuppliedAssets(supplied);

      // Available assets - back to working version with simple GHO filter
      const availableAssetsWithData = [];

      for (const asset of completePosition.availableAssets) {
        // Skip if already supplied
        if (
          supplied.some(
            (suppliedAsset) => suppliedAsset.address === asset.address,
          )
        ) {
          continue;
        }

        // Simple filter: Skip GHO on Ethereum mainnet only
        if (asset.symbol === "GHO" && currentChainId === 1) {
          console.log(
            `🚫 Skipping GHO on Ethereum mainnet - borrow-only asset`,
          );
          continue;
        }

        try {
          const configData = await AaveMethods.fetchReserveConfigurationData(
            asset.address,
            currentChainId!,
          );

          availableAssetsWithData.push({
            ...asset,
            supplyAPY: configData.supplyAPY,
            canBeCollateral: configData.canBeCollateral,
            liquidityRate: configData.liquidityRate.toString(),
            token: createTokenFromAsset({
              symbol: asset.symbol,
              name: asset.name,
              address: asset.address,
              decimals: asset.decimals,
            }),
            chain: currentChain,
          });
        } catch (err) {
          console.warn(`Failed to get config for ${asset.symbol}:`, err);
          // Include with fallback data if config fails
          availableAssetsWithData.push({
            ...asset,
            supplyAPY: "0.00",
            canBeCollateral: false,
            liquidityRate: "0",
            token: createTokenFromAsset({
              symbol: asset.symbol,
              name: asset.name,
              address: asset.address,
              decimals: asset.decimals,
            }),
            chain: currentChain,
          });
        }
      }

      setAvailableAssets(availableAssetsWithData);

      // Log the collateral status for debugging
      const nonCollateralAssets = availableAssetsWithData.filter(
        (a) => !a.canBeCollateral,
      );
      if (nonCollateralAssets.length > 0) {
        console.log(
          "🚫 Assets that CANNOT be used as collateral:",
          nonCollateralAssets.map((a) => a.symbol),
        );
      }

      console.log(
        `✅ Showing ${availableAssetsWithData.length} available assets`,
      );

      setError(null);
    } catch (err) {
      const errorMessage = AaveMethods.parseContractError(err);
      setError(errorMessage);
      toast.error("Failed to fetch Aave data", { description: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [
    walletAddress,
    currentChainId,
    currentChain,
    createTokenFromAsset,
    validateAaveRequirements,
  ]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleRefresh = async () => {
    await fetchUserData();
  };

  if (!validation.isValid) {
    return (
      <div className="w-full p-4 text-center">
        <div className="text-yellow-500 mb-2">{validation.errorMessage}</div>
        <div className="text-sm text-gray-400">
          Aave works independently of your selected source chain and always uses
          your EVM wallet.
        </div>
        {!isEvmConnected && (
          <div className="text-sm text-blue-400 mt-2">
            Connect MetaMask or another EVM wallet to continue.
          </div>
        )}
      </div>
    );
  }

  const totalSuppliedValue = suppliedAssets.reduce((sum, asset) => {
    return sum + Number(asset.currentATokenBalance);
  }, 0);

  return (
    <div className="w-full space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded p-3 text-red-400">
          {error}
        </div>
      )}

      {/* Your Positions Accordion */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="positions"
          className="border-[1px] border-[#232326] rounded-md overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <SupplyYourPositionsHeader
              totalSupplied={totalSuppliedValue}
              positionsCount={suppliedAssets.length}
              loading={loading}
            />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse bg-gray-800 h-16 rounded mb-2"
                  />
                ))
              ) : suppliedAssets.length > 0 ? (
                suppliedAssets.map((asset) => (
                  <SupplyOwnedCard
                    key={asset.address}
                    title={asset.name}
                    subtitle={asset.symbol}
                    balance={asset.currentATokenBalance}
                    dollarAmount="0.00"
                    supplyAPY={asset.supplyAPY?.aaveMethod || "0.00"}
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
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse bg-gray-800 h-16 rounded mb-2"
                  />
                ))
              ) : availableAssets.length > 0 ? (
                availableAssets.map((asset) => (
                  <SupplyUnOwnedCard
                    key={asset.address}
                    title={asset.name}
                    subtitle={asset.symbol}
                    balance="0.00"
                    dollarAmount="0.00"
                    supplyAPY={asset.supplyAPY || "0.00"}
                    canBeCollateral={asset.canBeCollateral ?? true}
                    onSupply={async () => {
                      console.log(
                        `Supply ${asset.symbol} - APY: ${asset.supplyAPY}%`,
                      );
                      toast.info(`Supply ${asset.symbol}`, {
                        description: `Current APY: ${asset.supplyAPY}% • ${asset.canBeCollateral ? "Can be used as collateral" : "Cannot be used as collateral"}`,
                      });
                      await handleRefresh();
                    }}
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

      {/* Account Summary */}
      {accountData && (
        <div className="bg-gray-800 rounded-md p-4 mt-4">
          <h3 className="text-white mb-2">Account Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Total Collateral</div>
              <div className="text-white">
                {AaveMethods.formatCurrency(
                  Number(accountData.totalCollateralBase),
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Total Debt</div>
              <div className="text-white">
                {AaveMethods.formatCurrency(Number(accountData.totalDebtBase))}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Health Factor</div>
              <div
                className={AaveMethods.getHealthFactorColor(
                  accountData.healthFactor,
                )}
              >
                {Number(accountData.healthFactor).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Available to Borrow</div>
              <div className="text-white">
                {AaveMethods.formatCurrency(
                  Number(accountData.availableBorrowsBase),
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-400">LTV</div>
              <div className="text-white">{accountData.ltv.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-gray-400">Liquidation Threshold</div>
              <div className="text-white">
                {accountData.currentLiquidationThreshold.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplyComponent;
