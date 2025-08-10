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
  UserPosition,
} from "@/types/aave";
import SupplyAvailablePositionsHeader from "@/components/ui/lending/SupplyAvailablePositionsHeader";
import { useWalletConnection } from "@/utils/swap/walletMethods";

interface BorrowComponentProps {
  oraclePrices?: Record<string, number>;
  healthFactor?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  currentLTV?: number;
  liquidationThreshold?: number;
  userSupplyPositions?: UserPosition[];
  userBorrowPositions?: UserBorrowPosition[];
}

const BorrowComponent: React.FC<BorrowComponentProps> = ({
  oraclePrices = {},
  healthFactor = 1.24,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  currentLTV = 0,
  liquidationThreshold = 85,
  userSupplyPositions = [],
  userBorrowPositions = [],
}) => {
  const [borrowableReserves, setBorrowableReserves] = useState<
    AaveReserveData[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [tokensPreloaded, setTokensPreloaded] = useState(false); // Add this
  const [error, setError] = useState<string | null>(null);
  const [lastChainId, setLastChainId] = useState<number | null>(null);

  const aaveChain = useAaveChain();
  const getTokensForChain = useWeb3Store((state) => state.getTokensForChain);
  const tokensLoading = useWeb3Store((state) => state.tokensLoading);
  const tokenCount = useWeb3Store((state) => state.allTokensList.length);
  const loadTokens = useWeb3Store((state) => state.loadTokens);

  const chainTokens = useMemo(() => {
    return getTokensForChain(aaveChain.chainId);
  }, [getTokensForChain, aaveChain.chainId]);
  const { fetchAllReservesData, fetchUserWalletBalances } = useAaveFetch();
  const { isEvmConnected } = useWalletConnection();

  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  useEffect(() => {
    if (tokenCount === 0 && !tokensLoading && !tokensPreloaded) {
      setTokensPreloaded(true);
      loadTokens();
    }
  }, [loadTokens, tokensLoading, tokenCount, tokensPreloaded]);

  const loadAaveReserves = useCallback(
    async (force = false) => {
      if (loading && !force) {
        return;
      }

      if (tokensLoading) {
        return;
      }

      if (tokenCount === 0) {
        return;
      }

      if (chainTokens.length === 0) {
        return;
      }

      if (
        !force &&
        lastChainId === aaveChain.chainId &&
        borrowableReserves.length > 0
      ) {
        return;
      }
      if (!isWalletConnected) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        if (!isWalletConnected) return;
        const reservesResult: AaveReservesResult = await fetchAllReservesData(
          aaveChain,
          chainTokens,
        );

        // Fetch wallet balances if wallet is connected
        let borrowAssetsWithBalances = reservesResult.borrowAssets;
        if (isEvmConnected) {
          try {
            borrowAssetsWithBalances = await fetchUserWalletBalances(
              reservesResult.borrowAssets,
              oraclePrices,
            );
          } catch (error) {
            console.error("Error fetching wallet balances:", error);
          }
        }

        setBorrowableReserves(borrowAssetsWithBalances);
        setLastChainId(aaveChain.chainId);
      } catch (err) {
        console.error("Error loading Aave reserves:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load Aave reserves",
        );
        // Clear data on error
        setBorrowableReserves([]);
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
      isEvmConnected,
      fetchUserWalletBalances,
      oraclePrices,
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

  const handleBorrow = () => {
    // TODO: Implement borrow functionality
  };

  const handleDetails = () => {
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
  const isLoadingBorrowPositions = loading;

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
                    healthFactor={healthFactor?.toString() || "1.24"}
                    totalCollateralUSD={totalCollateralUSD}
                    totalDebtUSD={totalDebtUSD}
                    walletBalance={(() => {
                      const matchingReserve = borrowableReserves.find(
                        (reserve) =>
                          reserve.asset.address.toLowerCase() ===
                          borrowPosition.asset.asset.address.toLowerCase(),
                      );
                      return matchingReserve?.userBalanceFormatted || "0.00";
                    })()}
                    userSupplyPositions={userSupplyPositions}
                    userBorrowPositions={userBorrowPositions}
                    oraclePrices={oraclePrices}
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
                      healthFactor={healthFactor.toString()}
                      totalCollateralUSD={totalCollateralUSD}
                      totalDebtUSD={totalDebtUSD}
                      currentLTV={currentLTV}
                      liquidationThreshold={liquidationThreshold}
                      oraclePrices={oraclePrices}
                      userSupplyPositions={userSupplyPositions}
                      userBorrowPositions={userBorrowPositions}
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
