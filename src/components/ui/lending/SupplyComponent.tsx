import React, { useState, useEffect, useCallback } from "react";
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
import useWeb3Store, { useSourceChain } from "@/store/web3Store";
import {
  AaveReserveData,
  useAaveFetch,
  UserPosition,
  UserBorrowPosition,
} from "@/utils/aave/fetch";
import { fetchExtendedAssetDetails } from "@/utils/aave/extendedDetails";

const SupplyComponent: React.FC = () => {
  const [aaveReserves, setAaveReserves] = useState<AaveReserveData[]>([]);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [userBorrowPositions, setUserBorrowPositions] = useState<
    UserBorrowPosition[]
  >([]);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChainId, setLastChainId] = useState<number | null>(null);

  const sourceChain = useSourceChain();
  const { getWalletByType } = useWeb3Store();
  const wallet = getWalletByType(sourceChain.walletType);
  const { fetchAllReservesData, fetchUserPositions, fetchUserBorrowPositions } =
    useAaveFetch();

  const hasConnectedWallet = !!wallet?.address;

  // Get health factor from user positions data
  const getUserTotals = () => {
    if (!hasConnectedWallet) {
      return {
        healthFactor: "∞",
        totalCollateralUSD: 0,
        totalDebtUSD: 0,
      };
    }

    // Calculate total collateral from supply positions
    let totalCollateralWeighted = 0;
    userPositions.forEach((position) => {
      if (position.isCollateral) {
        const suppliedUSD = parseFloat(position.suppliedBalanceUSD || "0");
        const liquidationThreshold = position.asset.liquidationThreshold || 0;

        // Ensure liquidation threshold is in decimal form (0.0-1.0)
        const liquidationThresholdDecimal =
          liquidationThreshold > 1
            ? liquidationThreshold / 100
            : liquidationThreshold;

        totalCollateralWeighted += suppliedUSD * liquidationThresholdDecimal;
      }
    });

    // Calculate total debt from borrow positions
    const totalDebtUSD = userBorrowPositions.reduce((sum, position) => {
      return sum + parseFloat(position.totalDebtUSD || "0");
    }, 0);

    // Calculate health factor
    let healthFactor = "∞";
    if (totalDebtUSD > 0) {
      const hf = totalCollateralWeighted / totalDebtUSD;
      healthFactor = hf.toFixed(2);
    }

    return {
      healthFactor,
      totalCollateralUSD: userPositions.reduce((sum, position) => {
        if (position.isCollateral) {
          return sum + parseFloat(position.suppliedBalanceUSD || "0");
        }
        return sum;
      }, 0),
      totalDebtUSD,
    };
  };

  const userTotals = getUserTotals();

  // Get oracle price for a reserve
  const getOraclePrice = useCallback(
    async (reserve: AaveReserveData): Promise<number> => {
      const cached = tokenPrices[reserve.asset.toLowerCase()];
      if (cached) return cached;

      try {
        const extendedDetails = await fetchExtendedAssetDetails(
          reserve,
          sourceChain.chainId,
        );
        const oraclePrice =
          extendedDetails.oraclePrice || extendedDetails.currentPrice || 1;

        // Cache the oracle price
        setTokenPrices((prev) => ({
          ...prev,
          [reserve.asset.toLowerCase()]: oraclePrice,
        }));

        return oraclePrice;
      } catch (error) {
        console.error(
          `Error fetching oracle price for ${reserve.symbol}:`,
          error,
        );
        return 1;
      }
    },
    [sourceChain.chainId, tokenPrices],
  );

  // Move loadUserPositions to useCallback to fix dependency warning
  const loadUserPositions = useCallback(
    async (reserves: AaveReserveData[]) => {
      try {
        setPositionsLoading(true);
        console.log("Fetching user positions...");

        const positions = await fetchUserPositions(reserves);
        console.log(`Found ${positions.length} user positions`);

        setUserPositions(positions);
      } catch (err) {
        console.error("Error loading user positions:", err);
        // Don't set error state for positions - just log and continue
        setUserPositions([]);
      } finally {
        setPositionsLoading(false);
      }
    },
    [fetchUserPositions],
  );

  // Load user borrow positions for health factor calculation
  const loadUserBorrowPositions = useCallback(
    async (reserves: AaveReserveData[]) => {
      try {
        console.log("Fetching user borrow positions...");
        const borrowPositions = await fetchUserBorrowPositions(reserves);
        setUserBorrowPositions(borrowPositions);
      } catch (err) {
        console.error("Error loading user borrow positions:", err);
        setUserBorrowPositions([]);
      }
    },
    [fetchUserBorrowPositions],
  );

  const loadAaveReserves = useCallback(
    async (force = false) => {
      // Skip if already loading
      if (loading && !force) {
        console.log("Already loading, skipping...");
        return;
      }

      // Skip if same chain and we have data (unless forced)
      if (
        !force &&
        lastChainId === sourceChain.chainId &&
        aaveReserves.length > 0
      ) {
        console.log("Data already loaded for this chain, skipping...");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log(
          `Fetching Aave reserves for chain ${sourceChain.chainId}...`,
        );

        const reservesData = await fetchAllReservesData();

        console.log(
          `Successfully loaded ${reservesData.supplyAssets.length} Aave reserves`,
        );
        setAaveReserves(reservesData.supplyAssets);
        setLastChainId(sourceChain.chainId);

        // Load both user supply and borrow positions for health factor calculation
        await Promise.all([
          loadUserPositions(reservesData.supplyAssets),
          loadUserBorrowPositions(reservesData.borrowAssets),
        ]);

        // Preload oracle prices for calculation accuracy
        const pricePromises = reservesData.supplyAssets.map((reserve) =>
          getOraclePrice(reserve).catch(() => 1),
        );
        await Promise.all(pricePromises);
      } catch (err) {
        console.error("Error loading Aave reserves:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load Aave reserves",
        );
        // Clear data on error
        setAaveReserves([]);
        setUserPositions([]);
        setUserBorrowPositions([]);
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      lastChainId,
      sourceChain.chainId,
      aaveReserves.length,
      fetchAllReservesData,
      loadUserPositions,
      loadUserBorrowPositions,
      getOraclePrice,
    ],
  );

  // Load data when component mounts or chain changes
  useEffect(() => {
    loadAaveReserves();
  }, [loadAaveReserves]);

  // Reset data when chain changes (before new data loads)
  useEffect(() => {
    if (lastChainId !== null && lastChainId !== sourceChain.chainId) {
      setAaveReserves([]);
      setUserPositions([]);
      setUserBorrowPositions([]);
      setError(null);
    }
  }, [sourceChain.chainId, lastChainId]);

  // Add direct MetaMask chain change listener for immediate refresh
  useEffect(() => {
    const handleChainChanged = () => {
      console.log("MetaMask chain changed, clearing data and refreshing...");
      // Immediately clear cards and show loading state
      setAaveReserves([]);
      setUserPositions([]);
      setUserBorrowPositions([]);
      setError(null);
      setLoading(true);

      // Force refresh when MetaMask chain changes
      setTimeout(() => {
        loadAaveReserves(true);
      }, 200); // Small delay to ensure store has updated
    };

    // Listen for MetaMask chain changes
    if (typeof window !== "undefined" && window.ethereum) {
      const ethereum = window.ethereum as {
        on?: (event: string, callback: () => void) => void;
        removeListener?: (event: string, callback: () => void) => void;
      };
      ethereum.on?.("chainChanged", handleChainChanged);

      return () => {
        ethereum.removeListener?.("chainChanged", handleChainChanged);
      };
    }
  }, [loadAaveReserves]);

  const handleSupply = (asset: AaveReserveData) => {
    console.log("Supply asset:", asset);
    // TODO: Implement supply functionality
  };

  const handleSwitch = (asset: AaveReserveData) => {
    console.log("Switch collateral for asset:", asset);
    // TODO: Implement collateral switch functionality
  };

  const handleWithdraw = (asset: AaveReserveData) => {
    console.log("Withdraw asset:", asset);
    // TODO: Implement withdraw functionality
  };

  const handleRefresh = () => {
    console.log("Manual refresh triggered");
    loadAaveReserves(true); // Force refresh
  };

  const hasData = aaveReserves.length > 0;
  const hasUserPositions = userPositions.length > 0;
  const showEmptyState = !loading && !error && !hasData;
  const isLoadingPositions = loading || positionsLoading;

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
              {isLoadingPositions && (
                <div className="text-white text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <div>Loading your positions...</div>
                </div>
              )}

              {!isLoadingPositions && !hasUserPositions && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    No supply positions found
                  </div>
                  <div className="text-sm text-gray-500">
                    Supply assets to see your positions here
                  </div>
                </div>
              )}

              {!isLoadingPositions &&
                hasUserPositions &&
                userPositions.map((position, index) => (
                  <SupplyOwnedCard
                    key={`${position.asset.asset}-${sourceChain.chainId}-${index}`}
                    asset={position.asset}
                    suppliedBalance={position.suppliedBalance}
                    suppliedBalanceUSD={position.suppliedBalanceUSD}
                    isCollateral={position.isCollateral}
                    healthFactor={userTotals.healthFactor}
                    totalCollateralUSD={userTotals.totalCollateralUSD}
                    totalDebtUSD={userTotals.totalDebtUSD}
                    tokenPrice={
                      tokenPrices[position.asset.asset.toLowerCase()] || 1
                    }
                    onSwitch={handleSwitch}
                    onWithdraw={handleWithdraw}
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
              {loading && (
                <div className="text-white text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <div>Loading Aave reserves...</div>
                </div>
              )}

              {error && (
                <div className="text-center py-8">
                  <div className="text-red-400 mb-4">
                    Failed to load reserves: {error}
                  </div>
                  <div className="text-sm text-gray-400 mb-4">
                    Chain: {sourceChain.name}
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Loading..." : "Retry"}
                  </button>
                </div>
              )}

              {showEmptyState && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    No active reserves found
                  </div>
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              )}

              {hasData &&
                aaveReserves.map((reserve) => (
                  <SupplyUnOwnedCard
                    key={`${reserve.asset}-${sourceChain.chainId}`}
                    asset={reserve}
                    userBalance={reserve.userBalanceFormatted || "0.00"}
                    dollarAmount={reserve.userBalanceUsd || "0.00"}
                    healthFactor={userTotals.healthFactor}
                    totalCollateralUSD={userTotals.totalCollateralUSD}
                    totalDebtUSD={userTotals.totalDebtUSD}
                    tokenPrice={tokenPrices[reserve.asset.toLowerCase()] || 1}
                    onSupply={handleSupply}
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
