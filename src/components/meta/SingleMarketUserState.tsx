import { useEffect } from "react";
import { evmAddress, chainId } from "@aave/react";
import { useAaveUserMarketStateWithLoading } from "@/hooks/aave/useAaveUserData";
import {
  ChainId,
  EvmAddress,
  AaveMarket,
  MarketUserState,
  PercentValue,
  BigDecimal,
} from "@/types/aave";

interface MarketUserStateData {
  marketAddress: string;
  marketName: string;
  chainId: ChainId;
  data: MarketUserState | null;
  eModeEnabled: boolean | null;
  healthFactor: BigDecimal | null;
  ltv: PercentValue | null;
  currentLiquidationThreshold: PercentValue | null;
  loading: boolean;
  error: boolean;
  hasData: boolean;
}

interface SingleMarketUserStateProps {
  market: AaveMarket;
  onDataChange: (marketData: MarketUserStateData) => void;
  userWalletAddress: EvmAddress;
}

export const SingleMarketUserState: React.FC<SingleMarketUserStateProps> = ({
  market,
  onDataChange,
  userWalletAddress,
}) => {
  const { data, loading, error } = useAaveUserMarketStateWithLoading({
    chainId: chainId(market.chainId),
    market: evmAddress(market.address),
    user: userWalletAddress,
  });

  useEffect(() => {
    // Debug logging
    if (error) {
      console.error(`Market ${market.name} (${market.address}) error:`, error);
    }
    if (!loading && !data && !error) {
      console.warn(
        `Market ${market.name} (${market.address}) returned no data and no error`,
      );
    }
    if (data) {
      // console.log(
      //   `Market ${market.name} (${market.address}) loaded successfully:`,
      //   data,
      // );
    }

    const marketData: MarketUserStateData = {
      marketAddress: market.address,
      marketName: market.name,
      chainId: market.chainId as ChainId,
      data: data || null,
      eModeEnabled: data?.eModeEnabled ?? null,
      healthFactor: data?.healthFactor ?? null,
      ltv: data?.ltv ?? null,
      currentLiquidationThreshold: data?.currentLiquidationThreshold ?? null,
      error: !!error,
      loading,
      hasData: !!data,
    };

    onDataChange(marketData);
  }, [
    data,
    loading,
    error,
    market.address,
    market.name,
    market.chainId,
    onDataChange,
  ]);

  return null;
};
