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
import { useSourceChain } from "@/store/web3Store";
import {
  AaveReserveData,
  useAaveFetch,
  UserPosition,
} from "@/utils/aave/fetch";

const SupplyComponent: React.FC = () => {
  const [aaveReserves, setAaveReserves] = useState<AaveReserveData[]>([]);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChainId, setLastChainId] = useState<number | null>(null);

  const sourceChain = useSourceChain();
  const { fetchAllReservesData, fetchUserPositions } = useAaveFetch();

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

        // Now fetch user positions (supplied assets)
        await loadUserPositions(reservesData.supplyAssets);
      } catch (err) {
        console.error("Error loading Aave reserves:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load Aave reserves",
        );
        // Clear data on error
        setAaveReserves([]);
        setUserPositions([]);
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
      loadUserPositions, // Added this dependency
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

  const handleDetails = (asset: AaveReserveData) => {
    console.log("View asset details:", asset);
    // TODO: Implement details modal
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
            <SupplyAvailablePositionsHeader />
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
                    onSupply={handleSupply}
                    onDetails={handleDetails}
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
