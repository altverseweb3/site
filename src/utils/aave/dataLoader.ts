import { useCallback } from "react";
import { Chain, Token } from "@/types/web3";
import {
  AaveReserveData,
  UserPosition,
  UserBorrowPosition,
} from "@/types/aave";
import { useAaveFetch } from "@/utils/aave/fetch";
import { getChainByChainId } from "@/config/chains";
import { altverseAPI } from "@/api/altverse";

export const useAaveDataLoader = () => {
  const { fetchAllReservesData, fetchUserPositions, fetchUserBorrowPositions } =
    useAaveFetch();

  const fetchOraclePrices = useCallback(
    async (reserves: AaveReserveData[], chainId: number) => {
      try {
        const chainInfo = getChainByChainId(chainId);
        if (!chainInfo?.alchemyNetworkName) {
          return {};
        }

        const addresses = reserves.map((reserve) => ({
          network: chainInfo.alchemyNetworkName,
          address: reserve.asset.address,
        }));

        const priceResponse = await altverseAPI.getTokenPrices({ addresses });

        if (priceResponse.error || !priceResponse.data?.data) {
          return {};
        }

        const priceMap: Record<string, number> = {};
        priceResponse.data.data.forEach((tokenData, index) => {
          const reserve = reserves[index];
          const price = tokenData.prices?.[0]?.value
            ? parseFloat(tokenData.prices[0].value)
            : 1;
          priceMap[reserve.asset.address.toLowerCase()] = price;
        });

        return priceMap;
      } catch {
        return {};
      }
    },
    [],
  );

  const loadUserPositions = useCallback(
    async (
      supplyAssets: AaveReserveData[],
      borrowAssets: AaveReserveData[],
      hasConnectedWallet: boolean,
    ): Promise<{
      userSupplyPositions: UserPosition[];
      userBorrowPositions: UserBorrowPosition[];
    }> => {
      if (!hasConnectedWallet) {
        return {
          userSupplyPositions: [],
          userBorrowPositions: [],
        };
      }

      try {
        const [supplyPositions, borrowPositions] = await Promise.all([
          fetchUserPositions(supplyAssets),
          fetchUserBorrowPositions(borrowAssets),
        ]);

        return {
          userSupplyPositions: supplyPositions,
          userBorrowPositions: borrowPositions,
        };
      } catch (err) {
        console.error("Error loading user positions:", err);
        return {
          userSupplyPositions: [],
          userBorrowPositions: [],
        };
      }
    },
    [fetchUserPositions, fetchUserBorrowPositions],
  );

  const loadAaveData = useCallback(
    async ({
      aaveChain,
      chainTokens,
      hasConnectedWallet,
      force = false,
      loading = false,
      lastChainId = null,
      allReservesLength = 0,
    }: {
      aaveChain: Chain;
      chainTokens: Token[];
      hasConnectedWallet: boolean;
      force?: boolean;
      loading?: boolean;
      lastChainId?: number | null;
      allReservesLength?: number;
    }) => {
      if (loading && !force) {
        return null;
      }

      if (
        !force &&
        lastChainId === aaveChain.chainId &&
        allReservesLength > 0
      ) {
        return null;
      }

      try {
        const reservesResult = await fetchAllReservesData(
          aaveChain,
          chainTokens,
        );

        const allReservesData = [
          ...reservesResult.supplyAssets,
          ...reservesResult.borrowAssets,
        ];
        const uniqueReserves = allReservesData.filter(
          (reserve, index, self) =>
            index === self.findIndex((r) => r.asset === reserve.asset),
        );

        const prices = await fetchOraclePrices(
          uniqueReserves,
          aaveChain.chainId,
        );
        const { userSupplyPositions, userBorrowPositions } =
          await loadUserPositions(
            reservesResult.supplyAssets,
            reservesResult.borrowAssets,
            hasConnectedWallet,
          );

        return {
          allReserves: uniqueReserves,
          oraclePrices: prices,
          userSupplyPositions,
          userBorrowPositions,
        };
      } catch (err) {
        console.error("Error loading Aave data:", err);
        return {
          allReserves: [],
          oraclePrices: {},
          userSupplyPositions: [],
          userBorrowPositions: [],
        };
      }
    },
    [fetchAllReservesData, loadUserPositions, fetchOraclePrices],
  );

  return {
    loadAaveData,
    fetchOraclePrices,
    loadUserPositions,
  };
};
