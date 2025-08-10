import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import SupplyOwnedCard from "@/components/ui/lending/SupplyOwnedCard";
import SupplyYourPositionsHeader from "@/components/ui/lending/SupplyYourPositionsHeader";
import SupplyUnownedCard from "@/components/ui/lending/SupplyUnownedCard";
import SupplyAvailablePositionsHeader from "@/components/ui/lending/SupplyAvailablePositionsHeader";
import { ScrollBoxSupplyBorrowAssets } from "@/components/ui/lending/ScrollBoxSupplyBorrowAssets";
import useWeb3Store, {
  useAaveChain,
  useIsWalletTypeConnected,
} from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import {
  AaveReserveData,
  UserPosition,
  UserBorrowPosition,
} from "@/types/aave";
import { useAaveFetch } from "@/utils/aave/fetch";
import { formatBalance } from "@/utils/formatters";

interface SupplyComponentProps {
  oraclePrices?: Record<string, number>;
  userSupplyPositions?: UserPosition[];
  userBorrowPositions?: UserBorrowPosition[];
}

const SupplyComponent: React.FC<SupplyComponentProps> = ({
  oraclePrices = {},
  userSupplyPositions: propUserSupplyPositions = [],
  userBorrowPositions = [],
}) => {
  const [aaveReserves, setAaveReserves] = useState<AaveReserveData[]>([]);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [tokensPreloaded, setTokensPreloaded] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChainId, setLastChainId] = useState<number | null>(null);

  const aaveChain = useAaveChain();
  const getTokensForChain = useWeb3Store((state) => state.getTokensForChain);
  const tokensLoading = useWeb3Store((state) => state.tokensLoading);
  const tokenCount = useWeb3Store((state) => state.allTokensList.length);
  const loadTokens = useWeb3Store((state) => state.loadTokens);

  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  const chainTokens = useMemo(() => {
    return getTokensForChain(aaveChain.chainId);
  }, [getTokensForChain, aaveChain.chainId]);

  const { fetchUserPositions, fetchAllReservesData } = useAaveFetch();

  useEffect(() => {
    if (tokenCount === 0 && !tokensLoading && !tokensPreloaded) {
      setTokensPreloaded(true);
      loadTokens();
    }
  }, [loadTokens, tokensLoading, tokenCount, tokensPreloaded]);

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
        aaveReserves.length > 0
      ) {
        console.log("Data already loaded for this chain, skipping...");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching Aave reserves for chain ${aaveChain.chainId}...`);

        const reservesData = await fetchAllReservesData(aaveChain, chainTokens);

        console.log(
          `Successfully loaded ${reservesData.supplyAssets.length} Aave reserves`,
        );
        setAaveReserves(reservesData.supplyAssets);
        setLastChainId(aaveChain.chainId);

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
      tokensLoading,
      tokenCount,
      lastChainId,
      aaveChain,
      chainTokens,
      aaveReserves.length,
      fetchAllReservesData,
      loadUserPositions,
    ],
  );

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

  const handleSupply = (asset: AaveReserveData) => {
    console.log("Supply asset:", asset);
  };

  const handleWithdraw = (asset: AaveReserveData) => {
    console.log("Withdraw asset:", asset);
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
                    key={`${position.asset.asset.address}-${aaveChain.chainId}-${index}`}
                    currentAsset={position.asset}
                    suppliedBalance={position.suppliedBalance}
                    suppliedBalanceUSD={position.suppliedBalanceUSD}
                    isCollateral={position.isCollateral}
                    onWithdraw={handleWithdraw}
                    oraclePrices={oraclePrices}
                    userSupplyPositions={propUserSupplyPositions}
                    userBorrowPositions={userBorrowPositions}
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
                    Chain: {aaveChain.name}
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
                  <SupplyUnownedCard
                    key={`${reserve.asset.address}-${aaveChain.chainId}`}
                    currentAsset={reserve}
                    userBalance={formatBalance(
                      reserve.asset.userBalance || "0.00",
                    )}
                    dollarAmount={reserve.asset.userBalanceUsd || "0.00"}
                    onSupply={handleSupply}
                    oraclePrices={oraclePrices}
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
