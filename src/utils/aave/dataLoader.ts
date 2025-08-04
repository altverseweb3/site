import { useCallback } from "react";
import { Chain, Token } from "@/types/web3";
import {
  AaveReserveData,
  UserPosition,
  UserBorrowPosition,
} from "@/types/aave";
import { useAaveFetch } from "@/utils/aave/fetch";
import { getAaveMarket } from "@/config/aave";
import { ethers } from "ethers";
import { IAaveOracle_ABI } from "@bgd-labs/aave-address-book/abis";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";

export const useAaveDataLoader = () => {
  const { fetchAllReservesData, fetchUserPositions, fetchUserBorrowPositions } =
    useAaveFetch();
  const { getEvmSigner } = useReownWalletProviderAndSigner();

  const fetchOraclePrices = useCallback(
    async (reserves: AaveReserveData[], chainId: number) => {
      try {
        const priceMapFromTokens: Record<string, number> = {};
        reserves.forEach((reserve) => {
          const tokenPriceUsd = reserve.asset.priceUsd;
          if (tokenPriceUsd && tokenPriceUsd !== "0") {
            const price =
              typeof tokenPriceUsd === "string"
                ? parseFloat(tokenPriceUsd)
                : tokenPriceUsd;
            if (!isNaN(price) && price > 0) {
              priceMapFromTokens[reserve.asset.address.toLowerCase()] = price;
            }
          }
        });

        try {
          const signer = await getEvmSigner();
          const provider = signer?.provider;

          if (!provider) {
            return priceMapFromTokens;
          }

          const market = getAaveMarket(chainId);
          if (!market.ORACLE) {
            return priceMapFromTokens;
          }

          const oracleContract = new ethers.Contract(
            market.ORACLE,
            IAaveOracle_ABI,
            provider,
          );

          const addresses = reserves.map((reserve) => reserve.asset.address);
          const prices = await oracleContract.getAssetsPrices(addresses);

          const priceMap: Record<string, number> = {};
          reserves.forEach((reserve, index) => {
            const priceInWei = prices[index];
            const price = parseFloat(ethers.formatUnits(priceInWei, 8));

            if (!isNaN(price) && price > 0) {
              priceMap[reserve.asset.address.toLowerCase()] = price;
            } else {
              const fallbackPrice =
                priceMapFromTokens[reserve.asset.address.toLowerCase()];
              if (fallbackPrice) {
                priceMap[reserve.asset.address.toLowerCase()] = fallbackPrice;
              }
            }
          });

          return priceMap;
        } catch (oracleError) {
          console.error("Error with oracle price fetch:", oracleError);
          return priceMapFromTokens;
        }
      } catch (error) {
        console.error("Error fetching oracle prices:", error);
        return {};
      }
    },
    [getEvmSigner],
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
      loading = false,
      lastChainId = null,
      allReservesLength = 0,
    }: {
      aaveChain: Chain;
      chainTokens: Token[];
      hasConnectedWallet: boolean;
      loading?: boolean;
      lastChainId?: number | null;
      allReservesLength?: number;
    }) => {
      if (loading) {
        return null;
      }

      if (lastChainId === aaveChain.chainId && allReservesLength > 0) {
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

        // Fetch oracle prices once for all unique reserves at the root level
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
