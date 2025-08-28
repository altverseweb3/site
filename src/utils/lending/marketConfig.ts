import { aaveMarkets } from "@/config/aave/markets";
import { AaveMarket } from "@/types/aave";

export const getActiveAaveMarkets = (): AaveMarket[] => {
  return aaveMarkets.filter((market) => market.isActive);
};

export const getActiveAaveMarketsByChainId = (
  chainId: number,
): AaveMarket[] => {
  return aaveMarkets.filter(
    (market) => market.isActive && market.chainId === chainId,
  );
};
