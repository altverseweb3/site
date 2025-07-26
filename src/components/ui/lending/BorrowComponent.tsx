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
} from "@/utils/aave/fetch";
import { fetchExtendedAssetDetails } from "@/utils/aave/extendedDetails";
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
    userSupplyPositions.forEach((position) => {
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
      totalCollateralUSD: userSupplyPositions.reduce((sum, position) => {
        if (position.isCollateral) {
          return sum + parseFloat(position.suppliedBalanceUSD || "0");
        }
        return sum;
      }, 0),
      totalDebtUSD,
    };
  };

  const userTotals = getUserTotals();

  // Get oracle price for a reserve using the same logic as AssetDetailsModal
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

        // Preload oracle prices for calculation accuracy
        const pricePromises = reservesResult.borrowAssets.map((reserve) =>
          getOraclePrice(reserve).catch(() => 1),
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
      getOraclePrice,
    ],
  );

  // Calculate available to borrow using existing user position data
  const calculateAvailableToBorrow = useCallback(
    (reserve: AaveReserveData): { amount: string; amountUSD: string } => {
      if (!hasConnectedWallet || userSupplyPositions.length === 0) {
        return { amount: "0.00", amountUSD: "0.00" };
      }

      try {
        // 1. Calculate total borrowing power from user's collateral positions
        let totalBorrowingPowerUSD = 0;

        userSupplyPositions.forEach((position) => {
          if (position.isCollateral) {
            const suppliedUSD = parseFloat(position.suppliedBalanceUSD || "0");
            const ltv = position.asset.ltv || 0;

            // Ensure LTV is in decimal form (0.0-1.0)
            const ltvDecimal = ltv > 1 ? ltv / 100 : ltv;
            const borrowingPower = suppliedUSD * ltvDecimal;
            totalBorrowingPowerUSD += borrowingPower;

            console.log(
              `Position: ${position.asset.symbol}, Supplied: $${suppliedUSD}, LTV: ${ltvDecimal}, Borrowing Power: $${borrowingPower}`,
            );
          }
        });

        // 2. Calculate current total debt from borrow positions
        const totalDebtUSD = userBorrowPositions.reduce((sum, position) => {
          return sum + parseFloat(position.totalDebtUSD || "0");
        }, 0);

        // 3. Calculate remaining borrowing capacity
        const remainingBorrowingPowerUSD = Math.max(
          0,
          totalBorrowingPowerUSD - totalDebtUSD,
        );

        console.log(`Total borrowing power: $${totalBorrowingPowerUSD}`);
        console.log(`Total debt: $${totalDebtUSD}`);
        console.log(
          `Remaining borrowing power: $${remainingBorrowingPowerUSD}`,
        );

        if (remainingBorrowingPowerUSD <= 0) {
          return { amount: "0.00", amountUSD: "0.00" };
        }

        // 4. Get available liquidity from the reserve (what Aave uses)
        // Use the availableLiquidity field from your example data
        const availableLiquidity = parseFloat(
          reserve.availableLiquidity ||
            reserve.formattedAvailableLiquidity ||
            "0",
        );

        console.log(`Reserve ${reserve.symbol}:`, {
          availableLiquidity: availableLiquidity,
          userBorrowingPowerUSD: remainingBorrowingPowerUSD,
          rawAvailableLiquidity: reserve.availableLiquidity,
          formattedAvailableLiquidity: reserve.formattedAvailableLiquidity,
        });

        if (availableLiquidity <= 0) {
          console.log(`No liquidity available in ${reserve.symbol} reserve`);
          return { amount: "0.00", amountUSD: "0.00" };
        }

        // 5. Get asset price with validation
        let tokenPrice = tokenPrices[reserve.asset.toLowerCase()];

        // Validate the price is reasonable
        if (!tokenPrice || tokenPrice <= 0 || isNaN(tokenPrice)) {
          console.log(
            `Invalid price for ${reserve.symbol} (${tokenPrice}), using fallback price of 1`,
          );
          tokenPrice = 1;
        }

        // Additional validation for extremely high/low prices that might be errors
        if (tokenPrice > 1000000 || tokenPrice < 0.000001) {
          console.log(
            `Suspicious price for ${reserve.symbol} ($${tokenPrice}), using fallback price of 1`,
          );
          tokenPrice = 1;
        }

        console.log(
          `Using validated price for ${reserve.symbol}: $${tokenPrice}`,
        );

        // 6. Calculate available to borrow following Aave's logic:
        // MIN(User's Borrowing Capacity, Reserve Available Liquidity)

        // Convert user's borrowing power from USD to token amount
        const userMaxBorrowTokens = remainingBorrowingPowerUSD / tokenPrice;

        // The final amount is limited by both user capacity and reserve liquidity
        const maxBorrowTokens = Math.min(
          userMaxBorrowTokens,
          availableLiquidity,
        );

        // Always round DOWN to prevent borrowing more than available
        // Use Math.floor for token amounts to ensure we never exceed capacity
        const availableTokensFloor =
          Math.floor(maxBorrowTokens * 1000000) / 1000000; // Round to 6 decimals, floor
        const availableUSDFloor =
          Math.floor(availableTokensFloor * tokenPrice * 100) / 100; // Round to 2 decimals, floor

        // Ensure non-negative
        const availableAmount = Math.max(0, availableTokensFloor);
        const availableUSD = Math.max(0, availableUSDFloor);

        console.log(`${reserve.symbol} Calculation:`, {
          userMaxBorrowTokens: userMaxBorrowTokens.toFixed(8),
          reserveAvailableLiquidity: availableLiquidity.toFixed(6),
          limitingFactor:
            userMaxBorrowTokens < availableLiquidity
              ? "User Capacity"
              : "Reserve Liquidity",
          tokenPrice: tokenPrice,
          beforeRounding: `${maxBorrowTokens.toFixed(8)} ${reserve.symbol} ($${(maxBorrowTokens * tokenPrice).toFixed(4)})`,
          afterFloorRounding: `${availableAmount.toFixed(6)} ${reserve.symbol} ($${availableUSD.toFixed(2)})`,
        });

        return {
          amount: availableAmount.toFixed(6),
          amountUSD: availableUSD.toFixed(2),
        };
      } catch (error) {
        console.error(
          `Error calculating available to borrow for ${reserve.symbol}:`,
          error,
        );
        return { amount: "0.00", amountUSD: "0.00" };
      }
    },
    [hasConnectedWallet, userSupplyPositions, userBorrowPositions, tokenPrices],
  );

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
                    healthFactor={userTotals.healthFactor}
                    totalCollateralUSD={userTotals.totalCollateralUSD}
                    totalDebtUSD={userTotals.totalDebtUSD}
                    tokenPrice={
                      tokenPrices[borrowPosition.asset.asset.toLowerCase()] || 1
                    }
                    onRepay={async (position, amount) => {
                      console.log("Repay", amount, "of", position.asset.symbol);
                      // Refresh data after successful repay
                      await loadAaveReserves(true);
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

              {!loading &&
                hasData &&
                hasConnectedWallet &&
                userSupplyPositions.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      No collateral supplied
                    </div>
                    <div className="text-sm text-gray-500">
                      Supply assets first to enable borrowing
                    </div>
                  </div>
                )}

              {hasData &&
                !loading &&
                borrowableReserves.map((reserve) => {
                  const borrowData = calculateAvailableToBorrow(reserve);
                  return (
                    <BorrowUnOwnedCard
                      key={`${reserve.asset}-${sourceChain.chainId}`}
                      asset={reserve}
                      availableToBorrow={borrowData.amount}
                      availableToBorrowUSD={borrowData.amountUSD}
                      onBorrow={handleBorrow}
                      healthFactor={userTotals.healthFactor}
                      totalCollateralUSD={userTotals.totalCollateralUSD}
                      totalDebtUSD={userTotals.totalDebtUSD}
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
