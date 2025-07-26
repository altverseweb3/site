import React, { useState, useCallback } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/lending/Accordion";
import { ScrollBoxSupplyBorrowAssets } from "./ScrollBoxSupplyBorrowAssets";
import useWeb3Store, {
  useSourceChain,
  useIsWalletTypeConnected,
} from "@/store/web3Store";
import {
  AaveReserveData,
  AaveReservesResult,
  UserBorrowPosition,
  useAaveFetch,
} from "@/utils/aave/fetch";
import BorrowUnOwnedCard from "./BorrowUnownedCard";
import BorrowOwnedCard from "./BorrowOwnedCard";
import { Button } from "@/components/ui/Button";
import { WalletType } from "@/types/web3";

// Legacy interface for mock data compatibility (no longer used)
// UserBorrowPosition is now imported from @/utils/aave/fetch

const BorrowComponent: React.FC = () => {
  const [borrowableReserves, setBorrowableReserves] = useState<
    AaveReserveData[]
  >([]);
  const [userBorrowPositions, setUserBorrowPositions] = useState<
    UserBorrowPosition[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [borrowPositionsLoading, setBorrowPositionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChainId, setLastChainId] = useState<number | null>(null);

  const sourceChain = useSourceChain();
  const { fetchAllReservesData, fetchUserBorrowPositions } = useAaveFetch();
  const connectedWallets = useWeb3Store((state) => state.connectedWallets);

  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  // Load user borrow positions using real Aave data
  const loadUserBorrowPositions = useCallback(
    async (reserves: AaveReserveData[]) => {
      try {
        setBorrowPositionsLoading(true);
        console.log("Fetching user borrow positions...");

        // Use real fetch function for borrow positions
        const borrowPositions = await fetchUserBorrowPositions(reserves);
        setUserBorrowPositions(borrowPositions);
      } catch (err) {
        console.error("Error loading user borrow positions:", err);
        setUserBorrowPositions([]);
      } finally {
        setBorrowPositionsLoading(false);
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
        borrowableReserves.length > 0
      ) {
        console.log("Data already loaded for this chain, skipping...");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log(
          `Fetching Aave reserves for borrowing on chain ${sourceChain.chainId}...`,
        );
        debugger;
        console.log(`Connected wallets: ${JSON.stringify(connectedWallets)}`);
        // Fetch reserves data using your enhanced function
        const reservesResult: AaveReservesResult = await fetchAllReservesData();

        console.log(
          `Successfully loaded ${reservesResult.borrowAssets.length} borrowable assets`,
        );
        setBorrowableReserves(reservesResult.borrowAssets);
        setLastChainId(sourceChain.chainId);

        // Now fetch user borrow positions
        await loadUserBorrowPositions(reservesResult.borrowAssets);
      } catch (err) {
        console.error("Error loading Aave reserves:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load Aave reserves",
        );
        // Clear data on error
        setBorrowableReserves([]);
        setUserBorrowPositions([]);
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      lastChainId,
      sourceChain.chainId,
      borrowableReserves.length,
      fetchAllReservesData,
      loadUserBorrowPositions, // Added this dependency
      connectedWallets,
    ],
  );

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

  // Load data when component mounts or chain changes
  // useEffect(() => {
  //   loadAaveReserves();
  // }, [loadAaveReserves]);

  // Reset data when chain changes
  // useEffect(() => {
  //   if (lastChainId !== null && lastChainId !== sourceChain.chainId) {
  //     setBorrowableReserves([]);
  //     setUserBorrowPositions([]);
  //     setError(null);
  //   }
  // }, [sourceChain.chainId, lastChainId]);

  // MetaMask chain change listener
  // useEffect(() => {
  //   const handleChainChanged = () => {
  //     console.log(
  //       "MetaMask chain changed, clearing borrow data and refreshing...",
  //     );
  //     setBorrowableReserves([]);
  //     setUserBorrowPositions([]);
  //     setError(null);
  //     setLoading(true);

  //     setTimeout(() => {
  //       loadAaveReserves(true);
  //     }, 200);
  //   };

  //   if (typeof window !== "undefined" && window.ethereum) {
  //     const ethereum = window.ethereum as {
  //       on?: (event: string, callback: () => void) => void;
  //       removeListener?: (event: string, callback: () => void) => void;
  //     };
  //     ethereum.on?.("chainChanged", handleChainChanged);

  //     return () => {
  //       ethereum.removeListener?.("chainChanged", handleChainChanged);
  //     };
  //   }
  // }, [loadAaveReserves]);

  const handleBorrow = (asset: AaveReserveData) => {
    console.log("Borrow asset:", asset);
    // TODO: Implement borrow functionality
  };

  const handleDetails = (asset: AaveReserveData) => {
    console.log("View asset details:", asset);
    // TODO: Implement details modal
  };

  // const handleRefresh = () => {
  //   console.log("Manual refresh triggered");
  //   loadAaveReserves(true);
  // };

  const hasData = borrowableReserves.length > 0;
  const hasBorrowPositions = userBorrowPositions.length > 0;
  const showEmptyState = !loading && !error && !hasData;
  const isLoadingBorrowPositions = loading || borrowPositionsLoading;

  return (
    <div className="w-full space-y-4">
      <Button
        onClick={async () => {
          console.log("Button clicked");
          console.log("connectedWallets", connectedWallets);
          debugger;
          await loadAaveReserves(true);
        }}
      >
        HELLO MATE!!!
      </Button>
      {/* Only show accordion if wallet is connected */}
      {isWalletConnected ? (
        <>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem
              value="borrowPositions"
              className="border-[1px] border-[#232326] rounded-md overflow-hidden"
            >
              <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
                <div className="flex items-center justify-between w-full px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="text-[#FAFAFA] font-medium">
                      Your Borrows
                    </div>
                    {hasBorrowPositions && (
                      <div className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded">
                        {userBorrowPositions.length}
                      </div>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ScrollBoxSupplyBorrowAssets>
                  {isLoadingBorrowPositions && (
                    <div className="text-white text-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <div>Loading your borrow positions...</div>
                    </div>
                  )}

                  {!isLoadingBorrowPositions &&
                    hasBorrowPositions &&
                    userBorrowPositions.map((borrowPosition) => (
                      <BorrowOwnedCard
                        key={`${borrowPosition.asset.asset}-${sourceChain.chainId}`}
                        borrowPosition={borrowPosition}
                        healthFactor="1.24" // You'll want to get real health factor
                        totalCollateralUSD={0} // You'll want to get real values
                        totalDebtUSD={0} // You'll want to get real values
                        onRepay={async (position, amount) => {
                          console.log(
                            "Repay",
                            amount,
                            "of",
                            position.asset.symbol,
                          );
                          // TODO: Implement repay functionality
                          return true;
                        }}
                        onDetailsClick={(position) => {
                          console.log("Details for", position.asset.symbol);
                          // TODO: Implement details modal
                        }}
                      />
                    ))}

                  {!isLoadingBorrowPositions && !hasBorrowPositions && (
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
                <div className="flex items-center justify-between w-full px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="text-[#FAFAFA] font-medium">
                      Assets to Borrow
                    </div>
                    {borrowableReserves.length > 0 && (
                      <div className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded">
                        {borrowableReserves.length}
                      </div>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ScrollBoxSupplyBorrowAssets>
                  {loading && (
                    <div className="text-white text-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <div>Loading borrowable assets...</div>
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
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? "Loading..." : "Retry"}
                      </button>
                    </div>
                  )}

                  {showEmptyState && (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-4">
                        No borrowable assets found
                      </div>
                      <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                        Refresh
                      </button>
                    </div>
                  )}

                  {hasData &&
                    borrowableReserves.map((reserve) => {
                      const borrowData = calculateAvailableToBorrow(reserve);
                      return (
                        <BorrowUnOwnedCard
                          key={`${reserve.asset}-${sourceChain.chainId}`}
                          asset={reserve}
                          availableToBorrow={borrowData.amount}
                          availableToBorrowUSD={borrowData.amountUSD}
                          onBorrow={handleBorrow}
                          onDetails={handleDetails}
                          healthFactor="1.24" // You'll want to get real health factor
                          totalCollateralUSD={0} // You'll want to get real values
                          totalDebtUSD={0} // You'll want to get real values
                        />
                      );
                    })}
                </ScrollBoxSupplyBorrowAssets>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      ) : (
        <div>No wallet connected</div>
      )}
    </div>
  );
};

export default BorrowComponent;
