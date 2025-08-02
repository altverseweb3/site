import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import { ScrollBoxSupplyBorrowAssets } from "@/components/ui/lending/ScrollBoxSupplyBorrowAssets";
import useWeb3Store, {
  useAaveChain,
  useIsWalletTypeConnected,
} from "@/store/web3Store";
import { useAaveFetch } from "@/utils/aave/fetch";
import BorrowUnownedCard from "@/components/ui/lending/BorrowUnownedCard";
import BorrowOwnedCard from "@/components/ui/lending/BorrowOwnedCard";
import { WalletType } from "@/types/web3";
import {
  AaveReserveData,
  AaveReservesResult,
  UserBorrowPosition,
} from "@/types/aave";
import SupplyAvailablePositionsHeader from "@/components/ui/lending/SupplyAvailablePositionsHeader";

const BorrowComponent: React.FC = () => {
  const [borrowableReserves, setBorrowableReserves] = useState<
    AaveReserveData[]
  >([]);
  const [userBorrowPositions, setUserBorrowPositions] = useState<
    UserBorrowPosition[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [tokensPreloaded, setTokensPreloaded] = useState(false); // Add this
  const [borrowPositionsLoading, setBorrowPositionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChainId, setLastChainId] = useState<number | null>(null);

  const aaveChain = useAaveChain();
  const getTokensForChain = useWeb3Store((state) => state.getTokensForChain);
  const tokensLoading = useWeb3Store((state) => state.tokensLoading);
  const tokenCount = useWeb3Store((state) => state.allTokensList.length);
  const loadTokens = useWeb3Store((state) => state.loadTokens); // Add this line!

  const chainTokens = useMemo(() => {
    return getTokensForChain(aaveChain.chainId);
  }, [getTokensForChain, aaveChain.chainId]);
  const { fetchAllReservesData, fetchUserBorrowPositions } = useAaveFetch();

  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  useEffect(() => {
    if (tokenCount === 0 && !tokensLoading && !tokensPreloaded) {
      setTokensPreloaded(true);
      loadTokens();
    }
  }, [loadTokens, tokensLoading, tokenCount, tokensPreloaded]);

  // Load user borrow positions using real Aave data
  const loadUserBorrowPositions = useCallback(
    async (reserves: AaveReserveData[]) => {
      try {
        setBorrowPositionsLoading(true);
        console.log("Fetching user borrow positions...");

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

      if (tokensLoading) {
        console.log("Tokens still loading, skipping...");
        return;
      }

      if (tokenCount === 0) {
        console.log("No tokens loaded yet, skipping...");
        return;
      }

      if (chainTokens.length === 0) {
        console.log(
          `No tokens available for chain ${aaveChain.chainId}, skipping...`,
        );
        return;
      }

      // Skip if same chain and we have data (unless forced)
      if (
        !force &&
        lastChainId === aaveChain.chainId &&
        borrowableReserves.length > 0
      ) {
        console.log("Data already loaded for this chain, skipping...");
        return;
      }
      if (!isWalletConnected) {
        console.log("Wallet not connected, skipping...");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log(
          `Fetching Aave reserves for borrowing on chain ${aaveChain.chainId}...`,
        );
        if (!isWalletConnected) return;

        // Fetch reserves data using your enhanced function
        const reservesResult: AaveReservesResult = await fetchAllReservesData(
          aaveChain,
          chainTokens,
        );

        setBorrowableReserves(reservesResult.borrowAssets);
        setLastChainId(aaveChain.chainId);

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
      tokensLoading,
      tokenCount,
      isWalletConnected,
      lastChainId,
      aaveChain,
      chainTokens,
      borrowableReserves.length,
      fetchAllReservesData,
      loadUserBorrowPositions,
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

  const handleBorrow = (asset: AaveReserveData) => {
    console.log("Borrow asset:", asset);
    // TODO: Implement borrow functionality
  };

  const handleDetails = (asset: AaveReserveData) => {
    console.log("View asset details:", asset);
    // TODO: Implement details modal
  };

  useEffect(() => {
    if (
      isWalletConnected &&
      !tokensLoading &&
      tokenCount > 0 &&
      chainTokens.length > 0
    ) {
      loadAaveReserves();
    }
  }, [
    isWalletConnected,
    tokensLoading,
    tokenCount,
    chainTokens.length,
    loadAaveReserves,
    aaveChain.chainId,
  ]);

  const hasData = borrowableReserves.length > 0;
  const hasBorrowPositions = userBorrowPositions.length > 0;
  const showEmptyState = !loading && !error && !hasData;
  const isLoadingBorrowPositions = loading || borrowPositionsLoading;

  return (
    <div className="w-full space-y-4">
      {/* Only show accordion if wallet is connected */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="borrowPositions"
          className="border-[1px] border-[#232326] rounded-md overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <SupplyAvailablePositionsHeader text="your borrows" />
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
                    key={`${borrowPosition.asset.asset}-${aaveChain.chainId}`}
                    borrowPosition={borrowPosition}
                    healthFactor="1.24" // You'll want to get real health factor
                    totalCollateralUSD={0} // You'll want to get real values
                    totalDebtUSD={0} // You'll want to get real values
                    onRepay={async (position, amount) => {
                      console.log("Repay", amount, "of", position.asset.symbol);
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
            <SupplyAvailablePositionsHeader text="assets to borrow" />
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
                    Chain: {aaveChain.name}
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
                    <BorrowUnownedCard
                      key={`${reserve.asset.address}-${aaveChain.chainId}`}
                      currentAsset={reserve}
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
    </div>
  );
};

export default BorrowComponent;
