import React, { useState, useEffect, useRef } from "react";
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
import { AaveReserveData, useAaveFetch } from "@/utils/aave/fetch";

const SupplyComponent: React.FC = () => {
  const [aaveReserves, setAaveReserves] = useState<AaveReserveData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const sourceChain = useSourceChain();
  const { fetchAllReservesData } = useAaveFetch();

  const loadAaveReserves = async () => {
    // Only load once per component mount
    if (hasLoadedRef.current) {
      console.log(
        "Skipping Aave data fetch - already loaded once for this session",
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("Fetching Aave reserves data using connected wallet...");

      // Use the fetch class to get all reserves data
      // This will automatically batch process and stop when no more active reserves found
      const reservesData = await fetchAllReservesData();

      console.log(`Successfully loaded ${reservesData.length} Aave reserves`);
      setAaveReserves(reservesData);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("Error loading Aave reserves:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load Aave reserves",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load once when component mounts
    if (!hasLoadedRef.current) {
      loadAaveReserves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once

  // Reset when chain changes
  useEffect(() => {
    hasLoadedRef.current = false;
    setAaveReserves([]);
    setError(null);
    // Don't auto-load, wait for user to navigate back or refresh
  }, [sourceChain.chainId]);

  const handleSupply = (asset: AaveReserveData) => {
    console.log("Supply asset:", asset);
    // TODO: Implement supply functionality
  };

  const handleDetails = (asset: AaveReserveData) => {
    console.log("View asset details:", asset);
    // TODO: Implement details modal
  };

  const handleRefresh = () => {
    hasLoadedRef.current = false;
    loadAaveReserves();
  };

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
              {/* TODO: Replace with actual user positions */}
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
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
                  <div>
                    Polling ALL Aave reserves from Protocol Data Provider...
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Processing every token until completion - no early stopping
                  </div>
                </div>
              )}
              {error && (
                <div className="text-center py-8">
                  <div className="text-red-400 mb-4">Error: {error}</div>
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loading &&
                !error &&
                aaveReserves.length === 0 &&
                !hasLoadedRef.current && (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      Ready to load Aave reserves
                    </div>
                    <button
                      onClick={handleRefresh}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Load Reserves
                    </button>
                  </div>
                )}
              {!loading &&
                !error &&
                aaveReserves.length === 0 &&
                hasLoadedRef.current && (
                  <div className="text-gray-400 text-center py-4">
                    No active reserves found
                  </div>
                )}
              {!loading &&
                !error &&
                aaveReserves.map((reserve) => (
                  <SupplyUnOwnedCard
                    key={`${reserve.asset}-${reserve.name}`}
                    asset={reserve}
                    userBalance={reserve.userBalanceFormatted || "0.00"}
                    dollarAmount={reserve.userBalanceUsd || "0.00"}
                    onSupply={handleSupply}
                    onDetails={handleDetails}
                  />
                ))}
              {!loading && !error && aaveReserves.length > 0 && (
                <div className="text-center py-4">
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                  >
                    Refresh Data
                  </button>
                  <div className="text-xs text-gray-500 mt-2">
                    Loaded {aaveReserves.length} active reserves • Chain:{" "}
                    {sourceChain.chainId} • Complete dataset
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
