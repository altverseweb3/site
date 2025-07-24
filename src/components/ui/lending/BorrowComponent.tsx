import React, { useState, useEffect, useCallback } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/lending/Accordion";
import { ScrollBoxSupplyBorrowAssets } from "./ScrollBoxSupplyBorrowAssets";
import useWeb3Store, { useSourceChain } from "@/store/web3Store";
import {
  AaveReserveData,
  AaveReservesResult,
  UserBorrowPosition,
  UserPosition,
  useAaveFetch,
  getTokenPrice as fetchTokenPrice,
} from "@/utils/aave/fetch";
import BorrowUnOwnedCard from "./BorrowUnownedCard";
import BorrowOwnedCard from "./BorrowOwnedCard";
import SupplyAvailablePositionsHeader from "./SupplyAvailablePositionsHeader";

const BorrowComponent: React.FC = () => {
  const [borrowableReserves, setBorrowableReserves] = useState<
    AaveReserveData[]
  >([]);
  const [userBorrowPositions, setUserBorrowPositions] = useState<
    UserBorrowPosition[]
  >([]);
  const [userSupplyPositions, setUserSupplyPositions] = useState<
    UserPosition[]
  >([]);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [borrowPositionsLoading, setBorrowPositionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChainId, setLastChainId] = useState<number | null>(null);

  const sourceChain = useSourceChain();
  const { getWalletByType } = useWeb3Store();
  const wallet = getWalletByType(sourceChain.walletType);
  const { fetchAllReservesData, fetchUserBorrowPositions, fetchUserPositions } =
    useAaveFetch();

  const hasConnectedWallet = !!wallet?.address;

  // Calculate real health factor from user positions
  const calculateHealthFactor = () => {
    if (!hasConnectedWallet || userSupplyPositions.length === 0) return "∞";

    let totalCollateralWeighted = 0;
    let totalDebtUSD = 0;

    userSupplyPositions.forEach((position) => {
      const suppliedUSD = parseFloat(position.suppliedBalanceUSD || "0");
      const liquidationThreshold = position.asset.liquidationThreshold || 0.85;
      totalCollateralWeighted += suppliedUSD * liquidationThreshold;
    });

    userBorrowPositions.forEach((position) => {
      totalDebtUSD += parseFloat(position.totalDebtUSD || "0");
    });

    if (totalDebtUSD === 0) return "∞";
    return (totalCollateralWeighted / totalDebtUSD).toFixed(2);
  };

  // Calculate real total collateral and debt
  const getUserTotals = () => {
    const totalCollateralUSD = userSupplyPositions.reduce((sum, position) => {
      return sum + parseFloat(position.suppliedBalanceUSD || "0");
    }, 0);

    const totalDebtUSD = userBorrowPositions.reduce((sum, position) => {
      return sum + parseFloat(position.totalDebtUSD || "0");
    }, 0);

    return { totalCollateralUSD, totalDebtUSD };
  };

  // Get token price for a reserve with caching
  const getTokenPrice = useCallback(
    async (reserve: AaveReserveData): Promise<number> => {
      const cached = tokenPrices[reserve.asset.toLowerCase()];
      if (cached) return cached;

      try {
        // Use the existing fetch utility function
        const price = await fetchTokenPrice(reserve, sourceChain.chainId);

        // Cache the price for future use
        setTokenPrices((prev) => ({
          ...prev,
          [reserve.asset.toLowerCase()]: price,
        }));

        return price;
      } catch (error) {
        console.error(`Error fetching price for ${reserve.symbol}:`, error);
        return 1;
      }
    },
    [sourceChain.chainId, tokenPrices],
  );

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

  const loadUserSupplyPositions = useCallback(
    async (reserves: AaveReserveData[]) => {
      try {
        const supplyPositions = await fetchUserPositions(reserves);
        setUserSupplyPositions(supplyPositions);
      } catch (err) {
        console.error("Error loading user supply positions:", err);
        setUserSupplyPositions([]);
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

        const reservesResult: AaveReservesResult = await fetchAllReservesData();

        setBorrowableReserves(reservesResult.borrowAssets);
        setLastChainId(sourceChain.chainId);

        // Load both user borrow and supply positions for calculations
        await Promise.all([
          loadUserBorrowPositions(reservesResult.borrowAssets),
          loadUserSupplyPositions(reservesResult.supplyAssets),
        ]);

        // Preload token prices for calculation accuracy
        const pricePromises = reservesResult.borrowAssets.map((reserve) =>
          getTokenPrice(reserve).catch(() => 1),
        );
        await Promise.all(pricePromises);
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
      loadUserBorrowPositions,
      loadUserSupplyPositions,
      getTokenPrice,
    ],
  );

  // Calculate available to borrow for each reserve based on user's real collateral
  const calculateAvailableToBorrow = (
    reserve: AaveReserveData,
  ): { amount: string; amountUSD: string } => {
    if (!hasConnectedWallet || userSupplyPositions.length === 0) {
      return { amount: "0.00", amountUSD: "0.00" };
    }

    // 1. Calculate user's borrowing power based on supplied collateral
    let totalBorrowingPowerUSD = 0;
    userSupplyPositions.forEach((position) => {
      const suppliedUSD = parseFloat(position.suppliedBalanceUSD || "0");
      const ltv = position.asset.ltv || 0; // LTV ratio for this collateral
      if (position.isCollateral) {
        totalBorrowingPowerUSD += suppliedUSD * ltv;
      }
    });

    // 2. Calculate current debt USD to get remaining borrowing power
    const { totalDebtUSD } = getUserTotals();
    const remainingBorrowingPowerUSD = Math.max(
      0,
      totalBorrowingPowerUSD - totalDebtUSD,
    );

    // 3. Check reserve constraints
    const reserveLiquidity = parseFloat(
      reserve.formattedAvailableLiquidity || "0",
    );
    const borrowCap = parseFloat(reserve.formattedBorrowCap || "0");
    const currentBorrowed = parseFloat(reserve.formattedTotalBorrowed || "0");

    // Available liquidity in the reserve
    let maxBorrowFromReserve = reserveLiquidity;

    // Apply borrow cap if it exists
    if (borrowCap > 0) {
      const remainingCapacity = borrowCap - currentBorrowed;
      maxBorrowFromReserve = Math.min(maxBorrowFromReserve, remainingCapacity);
    }

    // 4. Get token price to convert USD to token amount
    const cachedPrice = tokenPrices[reserve.asset.toLowerCase()] || 1;

    // 5. Calculate final available amount
    const maxBorrowUSD = Math.min(
      remainingBorrowingPowerUSD,
      maxBorrowFromReserve * cachedPrice,
    );
    const maxBorrowTokens = maxBorrowUSD / cachedPrice;

    // Ensure non-negative and format to reasonable precision
    const availableAmount = Math.max(0, maxBorrowTokens);
    const availableUSD = Math.max(0, maxBorrowUSD);

    return {
      amount: availableAmount.toFixed(6),
      amountUSD: availableUSD.toFixed(2),
    };
  };

  // Load data when component mounts or chain changes
  useEffect(() => {
    loadAaveReserves();
  }, [loadAaveReserves]);

  // Reset data when chain changes
  useEffect(() => {
    if (lastChainId !== null && lastChainId !== sourceChain.chainId) {
      setBorrowableReserves([]);
      setUserBorrowPositions([]);
      setError(null);
    }
  }, [sourceChain.chainId, lastChainId]);

  // MetaMask chain change listener
  useEffect(() => {
    const handleChainChanged = () => {
      console.log(
        "MetaMask chain changed, clearing borrow data and refreshing...",
      );
      setBorrowableReserves([]);
      setUserBorrowPositions([]);
      setError(null);
      setLoading(true);

      setTimeout(() => {
        loadAaveReserves(true);
      }, 200);
    };

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

  const handleBorrow = (asset: AaveReserveData) => {
    console.log("Borrow asset:", asset);
    // TODO: Implement borrow functionality
  };

  const handleRefresh = () => {
    console.log("Manual refresh triggered");
    loadAaveReserves(true);
  };

  const hasData = borrowableReserves.length > 0;
  const hasBorrowPositions = userBorrowPositions.length > 0;
  const showEmptyState = !loading && !error && !hasData;
  const isLoadingBorrowPositions = loading || borrowPositionsLoading;

  return (
    <div className="w-full space-y-4">
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
                    key={`${borrowPosition.asset.asset}-${sourceChain.chainId}`}
                    borrowPosition={borrowPosition}
                    healthFactor={calculateHealthFactor()}
                    totalCollateralUSD={getUserTotals().totalCollateralUSD}
                    totalDebtUSD={getUserTotals().totalDebtUSD}
                    onRepay={async (position, amount) => {
                      console.log("Repay", amount, "of", position.asset.symbol);
                      // TODO: Implement repay functionality
                      return true;
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
                    Chain: {sourceChain.name}
                  </div>
                  <button
                    onClick={handleRefresh}
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
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
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
                      healthFactor={calculateHealthFactor()}
                      totalCollateralUSD={getUserTotals().totalCollateralUSD}
                      totalDebtUSD={getUserTotals().totalDebtUSD}
                      tokenPrice={tokenPrices[reserve.asset.toLowerCase()] || 1}
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
