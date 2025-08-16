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
import PositionsLoadingComponent from "@/components/ui/lending/PositionsLoadingComponent";
import PositionsEmptyStateComponent from "@/components/ui/lending/PositionsEmptyStateComponent";
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
import { useWalletConnection } from "@/utils/swap/walletMethods";

interface SupplyComponentProps {
  oraclePrices?: Record<string, number>;
  userSupplyPositions?: UserPosition[];
  userBorrowPositions?: UserBorrowPosition[];
  isLoadingPositions?: boolean;
  onRefresh?: () => void;
}

const SupplyComponent: React.FC<SupplyComponentProps> = ({
  oraclePrices = {},
  userSupplyPositions: propUserSupplyPositions = [],
  userBorrowPositions = [],
  isLoadingPositions: externalLoadingPositions = false,
  onRefresh,
}) => {
  const [aaveReserves, setAaveReserves] = useState<AaveReserveData[]>([]);
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
  const { isEvmConnected } = useWalletConnection();

  const chainTokens = useMemo(() => {
    return getTokensForChain(aaveChain.chainId);
  }, [getTokensForChain, aaveChain.chainId]);

  const { fetchUserPositions, fetchAllReservesData, fetchUserWalletBalances } =
    useAaveFetch();

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

        await fetchUserPositions(reserves);

        // Positions are now managed at page level, so we don't store them locally
      } catch (err) {
        console.error("Error loading user positions:", err);
        // Don't set error state for positions - just log and continue
      } finally {
        setPositionsLoading(false);
      }
    },
    [fetchUserPositions],
  );

  const loadAaveReserves = useCallback(
    async (force = false) => {
      // Skip if already loading
      if (loading && !force) return;

      if (tokensLoading) return;

      if (tokenCount === 0) return;

      if (chainTokens.length === 0) {
        console.error(
          `No tokens available for chain ${aaveChain.chainId}, skipping...`,
        );
        return;
      }

      // Skip if same chain and we have data (unless forced)
      if (
        !force &&
        lastChainId === aaveChain.chainId &&
        aaveReserves.length > 0
      )
        return;

      try {
        setLoading(true);
        setError(null);

        const reservesData = await fetchAllReservesData(aaveChain, chainTokens);

        console.log(
          `Successfully loaded ${reservesData.supplyAssets.length} Aave reserves`,
        );

        // Fetch wallet balances if wallet is connected
        let reservesWithBalances = reservesData.supplyAssets;
        if (isEvmConnected) {
          try {
            console.log("Fetching wallet balances...");

            // Add wallet balances to reserves data
            reservesWithBalances = await fetchUserWalletBalances(
              reservesData.supplyAssets,
              oraclePrices,
            );
            console.log("Wallet balances fetched successfully");
          } catch (error) {
            console.error("Error fetching wallet balances:", error);
            // Continue with original reserves if wallet balance fetch fails
          }
        }

        setAaveReserves(reservesWithBalances);
        setLastChainId(aaveChain.chainId);

        // Now fetch user positions (supplied assets)
        await loadUserPositions(reservesWithBalances);
      } catch (err) {
        console.error("Error loading Aave reserves:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load Aave reserves",
        );
        // Clear data on error
        setAaveReserves([]);
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
      isEvmConnected,
      fetchUserWalletBalances,
      oraclePrices,
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
    if (onRefresh) {
      onRefresh(); // Use page-level refresh
    } else {
      loadAaveReserves(true); // Fallback to internal refresh
    }
  };

  const hasData = aaveReserves.length > 0;
  const hasUserPositions = propUserSupplyPositions.length > 0;
  const showEmptyState = !loading && !error && !hasData;
  const isLoadingPositions =
    loading || positionsLoading || externalLoadingPositions;

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
                <PositionsLoadingComponent message="loading your positions..." />
              )}

              {!isLoadingPositions && !hasUserPositions && (
                <PositionsEmptyStateComponent
                  title="no supply positions found"
                  subtitle="supply assets to see your positions here"
                />
              )}

              {!isLoadingPositions &&
                hasUserPositions &&
                propUserSupplyPositions.map((position, index) => (
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
                <PositionsLoadingComponent message="loading aave reserves..." />
              )}

              {error && (
                <PositionsEmptyStateComponent
                  title={`failed to load reserves: ${error}`}
                  subtitle={`chain: ${aaveChain.name}`}
                  showRefreshButton={true}
                  onRefresh={handleRefresh}
                  refreshDisabled={loading}
                  refreshText="retry"
                  isError={true}
                />
              )}

              {showEmptyState && (
                <PositionsEmptyStateComponent
                  title="no active reserves found"
                  showRefreshButton={true}
                  onRefresh={handleRefresh}
                  refreshDisabled={loading}
                />
              )}

              {hasData &&
                aaveReserves.map((reserve) => (
                  <SupplyUnownedCard
                    key={`${reserve.asset.address}-${aaveChain.chainId}`}
                    currentAsset={reserve}
                    userBalance={reserve.asset.userBalance || "0"}
                    dollarAmount={reserve.asset.userBalanceUsd || "0.00"}
                    onSupply={handleSupply}
                    oraclePrices={oraclePrices}
                    userSupplyPositions={propUserSupplyPositions}
                    userBorrowPositions={userBorrowPositions}
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
